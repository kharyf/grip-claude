const envFile = process.env.SERVER_ENV ? `.env.${process.env.SERVER_ENV}` : '.env';
require('dotenv').config({ path: envFile });
const express = require('express');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const oracledb = require('oracledb');
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const cors = require('cors');

const app = express();

const AWS_REGION = process.env.AWS_REGION || "us-east-1";
// API Gateway configuration
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "https://c0kjvdp5l5.execute-api.us-east-1.amazonaws.com/GripahAPIStage";

// SDK clients — initialized in init()
let secretsClient;
let dbPool;

async function initClients() {
    // Secrets Manager uses static IAM credentials from env vars
    secretsClient = new SecretsManagerClient({
        region: AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });

    // Oracle ATP connection pool (thin mode — no Oracle Instant Client required)
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    dbPool = await oracledb.createPool({
        user: process.env.ORACLE_DB_USER,
        password: process.env.ORACLE_DB_PASSWORD,
        connectString: process.env.ORACLE_DB_CONNECT_STRING,
        walletLocation: process.env.ORACLE_WALLET_DIR,
        walletPassword: process.env.ORACLE_WALLET_PASSWORD,
        poolMin: 2,
        poolMax: 10,
        poolIncrement: 1,
    });
    console.log('[Oracle] Connection pool created');
}

async function downgradeUser(cognitoUsername, email, reason) {
    const conn = await dbPool.getConnection();
    try {
        await conn.execute(
            `UPDATE gripah_users
             SET premium_user = 0, subscription_status = :status
             WHERE cognito_username = :username AND email = :email`,
            { status: reason, username: cognitoUsername, email },
            { autoCommit: true }
        );
        console.log(`Oracle: user ${cognitoUsername} downgraded (reason: ${reason})`);
    } finally {
        await conn.close();
    }
}

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
        const conn = await dbPool.getConnection();
        try {
            await conn.execute(
                `MERGE INTO gripah_users u USING DUAL
                 ON (u.cognito_username = :username AND u.email = :email)
                 WHEN MATCHED THEN UPDATE SET
                     premium_user = 1, subscription_status = 'active',
                     premium_until = TO_TIMESTAMP_TZ(:until, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'),
                     apple_original_tx_id = :txId
                 WHEN NOT MATCHED THEN INSERT
                     (cognito_username, email, premium_user, subscription_status, premium_until, apple_original_tx_id)
                 VALUES (:username, :email, 1, 'active',
                     TO_TIMESTAMP_TZ(:until, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'), :txId)`,
                {
                    username: cognitoId,
                    email: req.user.email,
                    until: premiumUntil,
                    txId: activeSubscription.original_transaction_id || '',
                },
                { autoCommit: true }
            );
        } finally {
            await conn.close();
        }
        console.log(`Oracle updated: user ${cognitoId} is now premium until ${premiumUntil}`);

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

        const conn = await dbPool.getConnection();
        try {
            await conn.execute(
                `MERGE INTO gripah_users u USING DUAL
                 ON (u.cognito_username = :username AND u.email = :email)
                 WHEN MATCHED THEN UPDATE SET
                     premium_user = 1, subscription_status = 'active',
                     premium_until = TO_TIMESTAMP_TZ(:until, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'),
                     google_purchase_token = :token
                 WHEN NOT MATCHED THEN INSERT
                     (cognito_username, email, premium_user, subscription_status, premium_until, google_purchase_token)
                 VALUES (:username, :email, 1, 'active',
                     TO_TIMESTAMP_TZ(:until, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'), :token)`,
                {
                    username: cognitoId,
                    email: req.user.email,
                    until: premiumUntil,
                    token: purchaseToken,
                },
                { autoCommit: true }
            );
        } finally {
            await conn.close();
        }
        console.log(`Oracle updated: user ${cognitoId} is now premium until ${premiumUntil}`);

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

        // Guard: if the API says premium, verify premiumUntil hasn't passed
        if (isPremium) {
            const conn = await dbPool.getConnection();
            let premiumUntil;
            try {
                const result = await conn.execute(
                    `SELECT premium_until FROM gripah_users
                     WHERE cognito_username = :username AND email = :email`,
                    { username: req.userId, email }
                );
                premiumUntil = result.rows[0]?.PREMIUM_UNTIL?.toISOString();
            } finally {
                await conn.close();
            }
            if (premiumUntil && new Date(premiumUntil) < new Date()) {
                console.log(`[Expiry] User ${req.userId} premiumUntil ${premiumUntil} has passed — downgrading`);
                await downgradeUser(req.userId, email, 'expired');
                return res.send({ isPremium: false, details: { subscriptionStatus: 'expired' } });
            }
        }

        res.send({
            isPremium: isPremium,
            details: data.details || data
        });

    } catch (error) {
        console.error('Error fetching premium status via API Gateway:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});


// Apple App Store Server Notifications V2
// Apple sends a signed JWT (JWS). We decode the payload without full cert verification
// since this endpoint can only downgrade users, never grant access.
app.post('/apple-notifications', async (req, res) => {
    try {
        const { signedPayload } = req.body;
        if (!signedPayload) return res.status(400).json({ error: { message: 'Missing signedPayload' } });

        const payloadBase64 = signedPayload.split('.')[1];
        const notification = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
        const { notificationTypeV2, data } = notification;
        console.log(`[Apple Notification] Type: ${notificationTypeV2}`);

        const DOWNGRADE_TYPES = ['EXPIRED', 'DID_FAIL_TO_RENEW', 'GRACE_PERIOD_EXPIRED', 'REVOKE'];
        if (!DOWNGRADE_TYPES.includes(notificationTypeV2)) {
            return res.status(200).json({ received: true });
        }

        const txBase64 = data?.signedTransactionInfo?.split('.')[1];
        if (!txBase64) return res.status(400).json({ error: { message: 'Missing signedTransactionInfo' } });

        const txInfo = JSON.parse(Buffer.from(txBase64, 'base64url').toString('utf8'));
        const originalTransactionId = txInfo.originalTransactionId;
        console.log(`[Apple Notification] originalTransactionId: ${originalTransactionId}`);

        const conn1 = await dbPool.getConnection();
        let user;
        try {
            const result = await conn1.execute(
                `SELECT cognito_username, email FROM gripah_users
                 WHERE apple_original_tx_id = :txId`,
                { txId: originalTransactionId }
            );
            if (result.rows.length > 0) {
                user = {
                    cognitoUsername: result.rows[0].COGNITO_USERNAME,
                    email: result.rows[0].EMAIL,
                };
            }
        } finally {
            await conn1.close();
        }
        if (!user) {
            console.warn(`[Apple Notification] No user found for originalTransactionId ${originalTransactionId}`);
            return res.status(200).json({ received: true });
        }

        await downgradeUser(user.cognitoUsername, user.email, notificationTypeV2.toLowerCase());
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('[Apple Notification] Error:', error);
        res.status(500).json({ error: { message: error.message } });
    }
});

// Google Play Developer Notifications (Cloud Pub/Sub push)
// Google wraps the notification in: { message: { data: "<base64 JSON>" }, subscription: "..." }
app.post('/google-notifications', async (req, res) => {
    try {
        const messageData = req.body?.message?.data;
        if (!messageData) return res.status(400).json({ error: { message: 'Missing message.data' } });

        const notification = JSON.parse(Buffer.from(messageData, 'base64').toString('utf8'));
        const subNotif = notification.subscriptionNotification;

        if (!subNotif) {
            return res.status(200).json({ received: true }); // testNotification or non-subscription event
        }

        const { notificationType, purchaseToken } = subNotif;
        console.log(`[Google Notification] Type: ${notificationType}`);

        // 3=CANCELED, 5=ON_HOLD, 12=REVOKED, 13=EXPIRED
        const DOWNGRADE_TYPES = [3, 5, 12, 13];
        if (!DOWNGRADE_TYPES.includes(notificationType)) {
            return res.status(200).json({ received: true });
        }

        const conn2 = await dbPool.getConnection();
        let user;
        try {
            const result = await conn2.execute(
                `SELECT cognito_username, email FROM gripah_users
                 WHERE google_purchase_token = :token`,
                { token: purchaseToken }
            );
            if (result.rows.length > 0) {
                user = {
                    cognitoUsername: result.rows[0].COGNITO_USERNAME,
                    email: result.rows[0].EMAIL,
                };
            }
        } finally {
            await conn2.close();
        }
        if (!user) {
            console.warn(`[Google Notification] No user found for purchaseToken`);
            return res.status(200).json({ received: true }); // 200 so PubSub doesn't retry
        }

        const reasonMap = { 3: 'canceled', 5: 'on_hold', 12: 'revoked', 13: 'expired' };
        await downgradeUser(user.cognitoUsername, user.email, reasonMap[notificationType]);
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('[Google Notification] Error:', error);
        res.status(500).json({ error: { message: error.message } });
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
        await initClients();

        const PORT = process.env.PORT || 3000;
        const server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        // Graceful shutdown handling
        process.on('SIGTERM', () => {
            console.log('SIGTERM signal received: closing HTTP server');
            server.close(async () => {
                await dbPool.close(10);
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
