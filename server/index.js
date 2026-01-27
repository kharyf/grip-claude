require('dotenv').config();
const express = require('express');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const cors = require('cors');

let stripe;
let publishableKey;
const app = express();

// AWS Secrets Manager setup
const secretsClient = new SecretsManagerClient({
    region: process.env.AWS_REGION || "us-east-1",
});

// API Gateway configuration
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "https://c0kjvdp5l5.execute-api.us-east-1.amazonaws.com/GripahAPIStage";

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

// Endpoint for frontend to get Stripe configuration
app.get('/stripe-config', (req, res) => {
    if (!publishableKey) {
        return res.status(503).send({ error: "Stripe configuration not yet available" });
    }
    res.send({ publishableKey });
});

// Create Stripe Checkout Session (for Subscriptions)
app.post('/create-subscription', checkJwt, async (req, res) => {
    if (!stripe) {
        console.error('Stripe client not initialized');
        return res.status(503).send({ error: { message: "Stripe service is not initialized on the server. Check AWS secret configuration." } });
    }
    const { email, priceId } = req.body;

    const userId = req.userId;

    try {
        // 1. Find or Create Customer
        let customer;
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length > 0) {
            customer = customers.data[0];
            // Update metadata if it doesn't have cognitoId
            if (!customer.metadata.cognitoId) {
                await stripe.customers.update(customer.id, {
                    metadata: { cognitoId: userId }
                });
            }
        } else {
            customer = await stripe.customers.create({
                email,
                metadata: { cognitoId: userId }
            });
        }

        // 2. Create Subscription
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
        });

        res.send({
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
            customerId: customer.id,
        });

    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(400).send({ error: { message: error.message } });
    }
});

// Webhook handler - Adapted for Amazon EventBridge
app.post('/webhook', async (req, res) => {
    let event;

    try {
        event = req.body.detail || req.body;

        if (!event || !event.type) {
            throw new Error('Invalid EventBridge payload: missing event type');
        }
    } catch (err) {
        console.error(`EventBridge Processing Error: ${err.message}`);
        return res.status(400).send(`EventBridge Processing Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log(`Checkout completed for customer: ${session.customer}`);
            break;

        case 'invoice.paid':
            const invoice = event.data.object;
            console.log(`Invoice ${invoice.id} paid. Extending Pro access for ${invoice.customer}.`);
            break;

        case 'invoice.payment_failed':
            const failedInvoice = event.data.object;
            console.log(`Payment failed for ${failedInvoice.customer}. revoking/warning Pro status.`);
            break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
            const subUpdated = event.data.object;
            console.log(`Subscription ${subUpdated.id} updated. Status: ${subUpdated.status}`);
            break;

        case 'customer.subscription.deleted':
            const subDeleted = event.data.object;
            console.log(`Subscription ${subDeleted.id} deleted.`);
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.send({ received: true });
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

// Subscription status endpoint
app.get('/subscription-status', checkJwt, async (req, res) => {
    const userId = req.userId;

    try {
        // Search by cognitoId metadata
        const customers = await stripe.customers.search({
            query: `metadata['cognitoId']:'${userId}'`,
        });

        if (customers.data.length === 0) {
            return res.send({ status: 'none' });
        }

        const customer = customers.data[0];
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            limit: 1,
        });

        if (subscriptions.data.length > 0) {
            const subscription = subscriptions.data[0];
            const isPro = ['active', 'trialing'].includes(subscription.status);
            res.send({
                status: isPro ? 'active' : 'none',
                stripeStatus: subscription.status,
                subscriptionId: subscription.id
            });
        } else {
            res.send({ status: 'none' });
        }
    } catch (error) {
        console.error('Error fetching subscription status:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

// Initialize and start server
async function init() {
    try {
        const isProd = process.env.NODE_ENV === 'production';
        const secKeyName = isProd ? 'StripeSecLiveKey' : 'StripeSecTestKey';
        const pubKeyName = isProd ? 'StripePubLiveKey' : 'StripePubTestKey';

        const stripeSecretKey = await getSecret(secKeyName) || process.env.STRIPE_SECRET_KEY;
        publishableKey = await getSecret(pubKeyName) || process.env.STRIPE_PUBLISHABLE_KEY;

        if (!stripeSecretKey) {
            throw new Error(`Stripe secret key not found. Tried secret: ${secKeyName} and env: STRIPE_SECRET_KEY`);
        }

        stripe = require('stripe')(stripeSecretKey);

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Stripe Secret Key loaded from: ${stripeSecretKey === process.env.STRIPE_SECRET_KEY ? 'Environment' : 'AWS'}`);
            console.log(`Stripe Pub Key loaded from: ${publishableKey === process.env.STRIPE_PUBLISHABLE_KEY ? 'Environment' : 'AWS'}`);
        });
    } catch (error) {
        console.error('Failed to initialize server:', error);
        process.exit(1);
    }
}

init();
