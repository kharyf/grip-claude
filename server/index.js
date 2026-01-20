require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const cors = require('cors');

const app = express();

// Use JSON for all routes
app.use(express.json());
app.use(cors());

// Cognito JWT Verifier
const verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    tokenUse: "access",
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

// Create Stripe Checkout Session (for Subscriptions)
app.post('/create-subscription', checkJwt, async (req, res) => {
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
