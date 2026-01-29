# Stripe Payment Deep Linking & Webhook Configuration

This document explains how Gripah handles Stripe payments with automatic return-to-app functionality using deep linking and webhooks.

## Overview

The payment flow works as follows:
1. User initiates subscription in the app
2. Backend creates Stripe checkout session with deep link return URLs
3. User completes payment in browser/Stripe app
4. Stripe redirects back to app via deep links
5. Webhook confirms payment status
6. App updates subscription status

## Deep Link Configuration

### App Configuration

**app.json** includes:
- Scheme: `gripah`
- iOS: `LSApplicationQueriesSchemes` for deep linking
- Android: `intentFilters` for deep link handling

**Supported Deep Links:**
- `gripah://payment-success?session_id={CHECKOUT_SESSION_ID}`
- `gripah://payment-cancel?reason={cancel_reason}`

### Implementation Details

**App.js** (lines 122-155):
- Handles deep link events for both cold and warm app starts
- Processes Stripe checkout session returns
- Triggers subscription status updates
- Shows appropriate user feedback

## Webhook Configuration

### Server Endpoints

**POST /webhook** (server/index.js lines 158-210):
- Handles Stripe webhook events
- Supports both signature verification and EventBridge format
- Logs payment completion and subscription updates

### Supported Events:
- `checkout.session.completed` - Payment successful
- `invoice.paid` - Recurring payment successful
- `invoice.payment_failed` - Payment failed
- `customer.subscription.created/updated/deleted` - Subscription changes

## Backend Configuration

### Stripe Checkout Session

**POST /create-subscription** (server/index.js lines 102-155):
- Creates Stripe customer with Cognito ID metadata
- Generates checkout session with deep link return URLs
- Includes session ID in success URL for tracking

### Return URLs:
- Success: `gripah://payment-success?session_id={CHECKOUT_SESSION_ID}`
- Cancel: `gripah://payment-cancel?reason=Payment+cancelled`

## Testing the Configuration

### Local Development

1. **Simulator/Emulator Testing:**
   ```bash
   # Test deep link in simulator
   xcrun simctl openurl booted gripah://payment-success
   ```

2. **Webhook Testing:**
   ```bash
   # Use Stripe CLI for webhook testing
   stripe listen --forward-to localhost:3000/webhook
   ```

### Production Testing

1. **Test deep links on physical device:**
   - Create test subscription in app
   - Complete payment flow
   - Verify app opens with success message

2. **Verify webhook processing:**
   - Check server logs for webhook events
   - Confirm subscription status updates in app

## Environment Variables

### Required for Production:

**Server (.env):**
```
STRIPE_SECRET_KEY=sk_test_... (or live key)
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_... (or live key)
```

**AWS Secrets Manager:**
- `StripeSecTestKey` / `StripeSecLiveKey`
- `StripePubTestKey` / `StripePubLiveKey`

## Troubleshooting

### Deep Links Not Working:

1. **iOS:**
   - Verify scheme in `app.json`
   - Check `LSApplicationQueriesSchemes`
   - Ensure proper bundle identifier

2. **Android:**
   - Verify `intentFilters` configuration
   - Test with `adb shell am start` command
   - Check package name consistency

### Webhook Issues:

1. **Signature Verification:**
   - Ensure webhook secret is configured
   - Check Stripe webhook endpoint setup
   - Verify event structure

2. **Event Processing:**
   - Check server logs for webhook receipts
   - Verify Stripe event types are handled
   - Confirm metadata is properly passed

### Payment Flow Issues:

1. **Session Creation:**
   - Verify Stripe API keys
   - Check price ID configuration
   - Ensure customer metadata includes Cognito ID

2. **Return to App:**
   - Test deep link URLs directly
   - Verify URL encoding in return URLs
   - Check app scheme registration

## Security Considerations

1. **Deep Link Security:**
   - Validate deep link parameters
   - Sanitize user input from URLs
   - Limit sensitive data in URLs

2. **Webhook Security:**
   - Always verify Stripe signatures
   - Use HTTPS for webhook endpoints
   - Validate event structure before processing

3. **Session Security:**
   - Include Cognito ID in session metadata
   - Verify user ownership of subscriptions
   - Use proper authentication for status checks

## Best Practices

1. **User Experience:**
   - Show loading states during payment processing
   - Provide clear feedback for success/failure
   - Handle network interruptions gracefully

2. **Error Handling:**
   - Log deep link processing errors
   - Provide fallback for webhook failures
   - Implement retry logic for status checks

3. **Performance:**
   - Cache subscription status appropriately
   - Use efficient webhook processing
   - Minimize unnecessary API calls

This configuration ensures a seamless payment experience with automatic return to the app and real-time subscription status updates.