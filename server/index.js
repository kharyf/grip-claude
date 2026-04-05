const envFile = process.env.SERVER_ENV ? `.env.${process.env.SERVER_ENV}` : '.env';
require('dotenv').config({ path: envFile });
const express = require('express');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { STSClient, AssumeRoleWithWebIdentityCommand } = require("@aws-sdk/client-sts");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const cors = require('cors');

const app = express();

const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "GripahTestUsersTable";

// API Gateway configuration
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "https://c0kjvdp5l5.execute-api.us-east-1.amazonaws.com/GripahAPIStage";

// ── Cross-cloud credential provider (GCP Workload Identity → AWS STS) ─────────
// Fetches an OIDC token from the GCP metadata server (only available inside Cloud Run/GCE).
async function fetchGcpOidcToken(audience) {
    const url = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(audience)}`;
    const response = await fetch(url, { headers: { 'Metadata-Flavor': 'Google' } });
    if (!response.ok) throw new Error(`GCP metadata server returned ${response.status}`);
    return response.text();
}

let cachedCredentials = null;
let credentialExpiry = 0;

// Returns temporary AWS credentials by exchanging the GCP OIDC token with STS.
// Caches credentials and refreshes them 5 minutes before expiry.
// If AWS_ROLE_ARN is not set (local dev), returns undefined so the SDK uses ~/.aws.
async function getAwsCredentials() {
    const roleArn = process.env.AWS_ROLE_ARN;
    const audience = process.env.GCP_TOKEN_AUDIENCE || 'gripah-aws-access';

    if (!roleArn) return undefined;

    if (cachedCredentials && Date.now() < credentialExpiry - 5 * 60 * 1000) {
        return cachedCredentials;
    }

    try {
        const webIdentityToken = await fetchGcpOidcToken(audience);
        const stsClient = new STSClient({ region: AWS_REGION });
        const { Credentials } = await stsClient.send(new AssumeRoleWithWebIdentityCommand({
            RoleArn: roleArn,
            RoleSessionName: 'GripahCloudRunSession',
            WebIdentityToken: webIdentityToken,
            DurationSeconds: 3600,
        }));

        cachedCredentials = {
            accessKeyId: Credentials.AccessKeyId,
            secretAccessKey: Credentials.SecretAccessKey,
            sessionToken: Credentials.SessionToken,
        };
        credentialExpiry = Credentials.Expiration.getTime();
        console.log(`[AWS] Assumed role ${roleArn}, credentials valid until ${Credentials.Expiration}`);
        return cachedCredentials;
    } catch (err) {
        console.error('[AWS] STS credential exchange failed, falling back to env vars:', err.message);
        return undefined;
    }
}

// SDK clients — initialized in init() after credentials are fetched
let secretsClient;
let dynamo;

async function initAwsClients() {
    const credentials = await getAwsCredentials();
    const config = { region: AWS_REGION, ...(credentials && { credentials }) };

    secretsClient = new SecretsManagerClient(config);

    const dynamoClient = new DynamoDBClient(config);
    dynamo = DynamoDBDocumentClient.from(dynamoClient);
    console.log('[AWS] SDK clients initialized');
}
// ─────────────────────────────────────────────────────────────────────────────

async function getSecret(secretName) {
    console.log(`Fetching AWS secret: ${secretName}`);
    try {
        const response = await secretsClient.send(
            new GetSecretValueCommand({
                SecretId: secretName,
            })
        );
        const secret = response.SecretString;

        // AWS Secrets Manager often stores values as JSON strings.
        // If it's JSON, extract the value for the key that matches the secret name.
        try {
            const parsed = JSON.parse(secret);
            if (parsed[secretName]) {
                console.log(`Successfully parsed JSON secret for ${secretName}`);
                return parsed[secretName];
            }
            // If it's JSON but doesn't have the key, it might be the only key in the object
            const keys = Object.keys(parsed);
            if (keys.length === 1) {
                console.log(`Successfully parsed single-key JSON secret for ${secretName}`);
                return parsed[keys[0]];
            }
            console.log(`Secret for ${secretName} is JSON but format is unexpected. Returning as string.`);
            return secret;
        } catch (e) {
            // Not JSON, return as is
            return secret;
        }
    } catch (error) {
        console.error(`Error fetching secret ${secretName} from AWS:`, error);
        return null; // Let the caller decide fallback
    }
}


// Use JSON for all routes
app.use(express.json());
app.use(cors());

// Cognito JWT Verifier
const verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    tokenUse: "id",
    clientId: process.env.COGNITO_CLIENT_ID,
});

// Middleware to check Cognito JWT
const checkJwt = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).send({ error: "No authorization header" });
        }

        const token = authHeader.split(" ")[1];
        const payload = await verifier.verify(token);

        // Attach user info to request
        req.user = payload;
        req.userId = payload.sub;
        next();
    } catch (err) {
        console.error("Token verification failed:", err);
        return res.status(401).send({ error: "Unauthorized" });
    }
};

// Root endpoint
app.get('/', (req, res) => {
    res.send('Gripah Backend is running with Cognito Auth.');
});

// Health check endpoint for ECS/Fargate
app.get('/health', (req, res) => {
    res.status(200).send({ status: 'healthy', timestamp: new Date().toISOString() });
});


// Apple IAP receipt verification
app.post('/verify-apple-iap', checkJwt, async (req, res) => {
    try {
        const { receiptData, cognitoId } = req.body;

        if (!receiptData || !cognitoId) {
            return res.status(400).json({ error: { message: 'receiptData and cognitoId are required' } });
        }

        const sharedSecret = await getSecret('AppleIAPSharedSecret').catch(() => null)
            || process.env.APPLE_IAP_SHARED_SECRET;

        const verifyWithApple = async (url) => {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 'receipt-data': receiptData, password: sharedSecret }),
            });
            return response.json();
        };

        // Try production first; if Apple returns 21007 the receipt is a sandbox receipt
        let appleResponse = await verifyWithApple('https://buy.itunes.apple.com/verifyReceipt');
        if (appleResponse.status === 21007) {
            appleResponse = await verifyWithApple('https://sandbox.itunes.apple.com/verifyReceipt');
        }

        if (appleResponse.status !== 0) {
            return res.status(400).json({ error: { message: `Apple verification failed with status ${appleResponse.status}` } });
        }

        const latestReceipts = appleResponse.latest_receipt_info || [];
        const inAppReceipts = appleResponse.receipt?.in_app || [];
        const now = Date.now();

        // latest_receipt_info is empty on a first-ever sandbox purchase; fall back to receipt.in_app
        const activeSubscription =
            latestReceipts.find(r => parseInt(r.expires_date_ms) > now) ||
            inAppReceipts.find(r => parseInt(r.expires_date_ms) > now) ||
            inAppReceipts[inAppReceipts.length - 1]; // last entry = most recent purchase

        if (!activeSubscription) {
            return res.status(400).json({ error: { message: 'No active subscription found in receipt' } });
        }

        console.log(`Apple IAP verified for user ${cognitoId}, product: ${activeSubscription.product_id}, expires: ${activeSubscription.expires_date}`);

        // expires_date_ms may be absent on a fresh in_app entry; fall forward 30 days as a safe default
        const expiresMs = parseInt(activeSubscription.expires_date_ms) || (now + 30 * 24 * 60 * 60 * 1000);
        const premiumUntil = new Date(expiresMs).toISOString();
        await dynamo.send(new UpdateCommand({
            TableName: DYNAMODB_TABLE_NAME,
            Key: { cognitoUsername: cognitoId, email: req.user.email },
            UpdateExpression: 'SET premiumUser = :premium, subscriptionStatus = :status, premiumUntil = :until',
            ExpressionAttributeValues: {
                ':premium': true,
                ':status': 'active',
                ':until': premiumUntil,
            },
        }));
        console.log(`DynamoDB updated: user ${cognitoId} is now premium until ${premiumUntil}`);

        res.json({ success: true, expiresDate: activeSubscription.expires_date });
    } catch (error) {
        console.error('Apple IAP verification error:', error);
        res.status(500).json({ error: { message: error.message } });
    }
});

// Google Play IAP purchase verification
app.post('/verify-google-iap', checkJwt, async (req, res) => {
    try {
        const { purchaseToken, productId, packageName, cognitoId } = req.body;

        if (!purchaseToken || !productId || !packageName || !cognitoId) {
            return res.status(400).json({ error: { message: 'purchaseToken, productId, packageName, and cognitoId are required' } });
        }

        const serviceAccountJson = await getSecret('GooglePlayServiceAccount').catch(() => null)
            || process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;

        if (!serviceAccountJson) {
            return res.status(500).json({ error: { message: 'Google Play credentials not configured' } });
        }

        const serviceAccount = typeof serviceAccountJson === 'string'
            ? JSON.parse(serviceAccountJson)
            : serviceAccountJson;

        const { google } = require('googleapis');
        const auth = new google.auth.GoogleAuth({
            credentials: serviceAccount,
            scopes: ['https://www.googleapis.com/auth/androidpublisher'],
        });

        const androidPublisher = google.androidpublisher({ version: 'v3', auth });
        const response = await androidPublisher.purchases.subscriptions.get({
            packageName,
            subscriptionId: productId,
            token: purchaseToken,
        });

        const purchase = response.data;
        const expiryTimeMs = parseInt(purchase.expiryTimeMillis);

        if (expiryTimeMs < Date.now()) {
            return res.status(400).json({ error: { message: 'Subscription has expired' } });
        }

        // paymentState: 1 = payment received, 2 = free trial
        if (purchase.paymentState !== 1 && purchase.paymentState !== 2) {
            return res.status(400).json({ error: { message: 'Payment not completed' } });
        }

        const premiumUntil = new Date(expiryTimeMs).toISOString();
        console.log(`Google Play IAP verified for user ${cognitoId}, product: ${productId}, expires: ${premiumUntil}`);

        await dynamo.send(new UpdateCommand({
            TableName: DYNAMODB_TABLE_NAME,
            Key: { cognitoUsername: cognitoId, email: req.user.email },
            UpdateExpression: 'SET premiumUser = :premium, subscriptionStatus = :status, premiumUntil = :until',
            ExpressionAttributeValues: {
                ':premium': true,
                ':status': 'active',
                ':until': premiumUntil,
            },
        }));
        console.log(`DynamoDB updated: user ${cognitoId} is now premium until ${premiumUntil}`);

        res.json({ success: true, expiresDate: premiumUntil });
    } catch (error) {
        console.error('Google Play IAP verification error:', error);
        res.status(500).json({ error: { message: error.message } });
    }
});


// Premium user endpoint (API Gateway + Lambda based)
app.get('/premium-user', checkJwt, async (req, res) => {
    console.log('JWT Payload:', JSON.stringify(req.user, null, 2));
    const email = req.query.email || req.user.email || req.user['cognito:username'] || req.user.sub;

    if (!email) {
        console.error('Email not found in JWT payload');
        return res.status(400).send({ error: "Email not found in token." });
    }
    const targetUrl = `${API_GATEWAY_URL}?email=${encodeURIComponent(email)}`;
    console.log(`[Debug] Calling API Gateway: ${targetUrl}`);

    try {
        // Call the API Gateway + Lambda
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Authorization': req.headers.authorization, // Forward the token if needed
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Error] API Gateway returned error: ${response.status} ${errorText}`);
            return res.status(response.status).send({ error: 'Error calling premium user service' });
        }

        const rawData = await response.text();
        console.log(`[Debug] Raw API Gateway response: ${rawData}`);

        let data;
        try {
            data = JSON.parse(rawData);
        } catch (e) {
            console.error(`[Error] Failed to parse API Gateway response as JSON: ${e.message}`);
            return res.status(500).send({ error: 'Invalid response from premium user service' });
        }

        console.log(`[Debug] Parsed data for ${email}:`, JSON.stringify(data, null, 2));

        // Use the premium_user field from the API Gateway response
        const isPremium = data.premium_user === true || data.premium_user === 'true';

        console.log(`[Debug] Final isPremium determination for ${email}: ${isPremium}`);

        res.send({
            isPremium: isPremium,
            details: data.details || data
        });

    } catch (error) {
        console.error('Error fetching premium status via API Gateway:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});


// JSON error handler — catches express-jwt UnauthorizedError and any unhandled Express errors
// Must be defined with 4 args so Express treats it as an error-handling middleware
app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ error: { message: 'Invalid or expired token' } });
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: { message: err.message || 'Internal server error' } });
});

// Initialize and start server
async function init() {
    try {
        await initAwsClients();

        const PORT = process.env.PORT || 3000;
        const server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        // Graceful shutdown handling for Fargate
        process.on('SIGTERM', () => {
            console.log('SIGTERM signal received: closing HTTP server');
            server.close(() => {
                console.log('HTTP server closed');
                process.exit(0);
            });
        });
    } catch (error) {
        console.error('Failed to initialize server:', error);
        process.exit(1);
    }
}

init();
