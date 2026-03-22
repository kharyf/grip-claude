# Dual Server Deployment Guide

This repository is now configured to support two separate server instances: **Preview** (Staging) and **Production**.

## 1. Client-Side Profiles (`eas.json`)

The app uses DIFFERENT API URLs based on the EAS build profile:

- **Preview Profile**: Points to `https://gr-f1dda9023cb9481db8f60033be624a9b.ecs.us-east-1.on.aws`
- **Production Profile**: Points to `https://gripah-prod.your-production-url.com` (Placeholder)

> [!IMPORTANT]
> You must update the `EXPO_PUBLIC_API_URL` in the `production` profile of `eas.json` once you have your production server's live URL.

---

## 2. Server-Side Instances

Each server instance should be deployed with its own set of environment variables.

### Preview Instance
Use the template in `server/.env.preview`.
- `SERVER_ENV=preview`
- Points to the "Test" Stripe account and "Preview" Cognito User Pool.

### Production Instance
Use the template in `server/.env.production`.
- `SERVER_ENV=production`
- Points to the "Live" Stripe account and "Production" Cognito User Pool.

---

## 3. Deployment Instructions

### Local Testing
To test the server locally for a specific environment:
```bash
cd server
cp .env.preview .env  # Or .env.production
node index.js
```

### ECS / Fargate Deployment
When deploying to AWS ECS, ensure you set the `SERVER_ENV` environment variable in your Task Definition. The server will automatically choose the correct AWS Secret names (`StripeSecLiveKey` vs `StripeSecTestKey`) based on this variable.

---

## 4. AdMob Configuration

The app uses different AdMob identifiers based on the build profile in `eas.json`:

- **App IDs**: Configured in `app.json` and overridden by `eas.json`.
- **Ad Unit IDs**: Controlled by the following environment variables:
  - `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID`
  - `EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID`

### Preview vs. Production
- **Preview profile**: Uses Google's official **Test Unit IDs**.
- **Production profile**: Uses **Real Unit IDs** from the AdMob dashboard.
- **Fail-safe**: If the environment variables are missing, the code falls back to `TestIds` to prevent crashes during development.

