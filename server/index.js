require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { auth } = require('express-oauth2-jwt-bearer');
const cors = require('cors');

const app = express();

// Use JSON for all routes
app.use(express.json());

app.use(cors());

// Auth0 JWT check
const checkJwt = auth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
    tokenSigningAlg: 'RS256'
});

// Root endpoint
app.get('/', (req, res) => {
    res.send('Gripah Backend is running.');
});

// Create Stripe Checkout Session (for Subscriptions)
app.post('/create-subscription', checkJwt, async (req, res) => {
    const { email, priceId } = req.body;
    const userId = req.auth.payload.sub;

    try {
        // 1. Find or Create Customer
        let customer;
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length > 0) {
            customer = customers.data[0];
        } else {
            customer = await stripe.customers.create({
                email,
                metadata: { auth0Id: userId }
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
        // Amazon EventBridge typically wraps the Stripe event in a 'detail' field.
        // We also no longer verify the Stripe signature here since AWS handles security.
        event = req.body.detail || req.body;

        if (!event || !event.type) {
            throw new Error('Invalid EventBridge payload: missing event type');
        }
    } catch (err) {
        console.error(`EventBridge Processing Error: ${err.message}`);
        return res.status(400).send(`EventBridge Processing Error: ${err.message}`);
    }

    // Handle the event
    // NOTE: In production, you would update your database (e.g., MongoDB/Postgres) here.
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log(`Checkout completed for customer: ${session.customer}`);
            // Provision the subscription here if not already done
            break;

        case 'invoice.paid':
            // Fires for every successful payment (monthly renewal)
            const invoice = event.data.object;
            console.log(`Invoice ${invoice.id} paid. Extending Pro access for ${invoice.customer}.`);
            // Update user's "subscriptionStatus" to 'active' in DB
            break;

        case 'invoice.payment_failed':
            // Fires when renewal fails
            const failedInvoice = event.data.object;
            console.log(`Payment failed for ${failedInvoice.customer}. revoking/warning Pro status.`);
            // Update user's "subscriptionStatus" to 'past_due' or 'canceled'
            break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
            const subUpdated = event.data.object;
            console.log(`Subscription ${subUpdated.id} updated. Status: ${subUpdated.status}`);
            // Handle plan changes or initial creation
            break;

        case 'customer.subscription.deleted':
            const subDeleted = event.data.object;
            console.log(`Subscription ${subDeleted.id} deleted (cancelled or expired).`);
            // Revoke Pro access immediately in DB
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.send({ received: true });
});

// Subscription status endpoint
app.get('/subscription-status', checkJwt, async (req, res) => {
    const userId = req.auth.payload.sub;

    try {
        // In a production app, you should look this up in YOUR database (e.g. users.findOne({ auth0Id: userId }))
        // Direct Stripe queries are slow and hit rate limits.
        // For now, we search by metadata as a fallback.
        const customers = await stripe.customers.search({
            query: `metadata['auth0Id']:'${userId}'`,
        });

        if (customers.data.length === 0) {
            return res.send({ status: 'none' });
        }

        const customer = customers.data[0];
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all', // Check all to catch past_due or trialing
            limit: 1,
        });

        if (subscriptions.data.length > 0) {
            const subscription = subscriptions.data[0];
            // 'active' and 'trialing' both qualify for Pro (no ads)
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
