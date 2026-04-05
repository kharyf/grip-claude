import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { generateClient } from 'aws-amplify/api';
import * as RNIap from 'react-native-iap';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

// AppSync client - uses the userPool defaultAuthMode set in amplifyConfig
const client = generateClient();

// GraphQL subscription document
const ON_USER_UPDATED = /* GraphQL */ `
  subscription OnUserUpdated($cognitoUsername: String!) {
    onUserUpdated(cognitoUsername: $cognitoUsername) {
      cognitoUsername
      premiumUser
      subscriptionStatus
      premiumUntil
    }
  }
`;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://gripahserver-98886831409.us-west1.run.app';
const ANDROID_PACKAGE_NAME = 'com.loxodonta.gripah';

export const SubscriptionProvider = ({ children }) => {
    const { token, user } = useAuth();
    const [status, setStatus] = useState('none'); // 'none', 'active', 'loading'
    const [subscription, setSubscription] = useState(null);
    const [lastLoggedEmail, setLastLoggedEmail] = useState(null);
    const appSyncSubRef = useRef(null);
    const statusRef = useRef(status);

    useEffect(() => { statusRef.current = status; }, [status]);

    const API_STAGE_URL = process.env.EXPO_PUBLIC_API_STAGE_URL || 'https://c0kjvdp5l5.execute-api.us-east-1.amazonaws.com/GripahAPIStage';

    // ─── REST poll: used on login and as a fallback ───────────────────────────
    const checkStatus = async () => {
        if (!token) {
            setStatus('none');
            setSubscription(null);
            return;
        }

        setStatus('loading');
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const email = user?.attributes?.email;
            const cognitoUsername = user?.userId;
            const url = `${API_STAGE_URL}?cognitoUsername=${encodeURIComponent(cognitoUsername)}&email=${encodeURIComponent(email)}`;


            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('Server unreachable or returned error');

            const data = await response.json();
            const isPremiumUser =
                data.premium_user === true || data.premium_user === 'true' ||
                data.premiumUser === true || data.premiumUser === 'true';
            setStatus(isPremiumUser ? 'active' : 'none');
            setSubscription(data.details || null);
        } catch (error) {
            console.log('Subscription check skipped (server likely not reachable on this network):', error.message);
            setStatus('none');
        }
    };

    // ─── IAP lifecycle: init once on login, teardown on logout ───────────────
    useEffect(() => {
        if (!token) {
            RNIap.endConnection().catch(() => {});
            return;
        }

        let purchaseUpdateSub;
        let purchaseErrorSub;

        const setupIap = async () => {
            try {
                await RNIap.initConnection();

                purchaseUpdateSub = RNIap.purchaseUpdatedListener(async (purchase) => {
                    const receiptOrToken = Platform.OS === 'android'
                        ? purchase.purchaseToken
                        : purchase.transactionReceipt;

                    try {
                        // No receipt — finish the transaction so it doesn't accumulate in StoreKit's queue
                        if (!receiptOrToken) {
                            await RNIap.finishTransaction({ purchase, isConsumable: false }).catch(() => {});
                            return;
                        }

                        // Already premium — finish silently, no need to re-verify
                        if (statusRef.current === 'active') return;

                        const endpoint = Platform.OS === 'android' ? '/verify-google-iap' : '/verify-apple-iap';
                        const body = Platform.OS === 'android'
                            ? { purchaseToken: receiptOrToken, productId: purchase.productId, packageName: ANDROID_PACKAGE_NAME, cognitoId: user?.userId }
                            : { receiptData: receiptOrToken, cognitoId: user?.userId };

                        const response = await fetch(`${API_URL}${endpoint}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify(body),
                        });

                        if (!response.ok) {
                            let message = 'Purchase verification failed';
                            try {
                                const err = JSON.parse(await response.text());
                                message = err.error?.message || message;
                            } catch { /* non-JSON body */ }
                            throw new Error(message);
                        }

                        await checkStatus();
                        Alert.alert('Success', 'Your subscription is now active!');
                    } catch (err) {
                        console.error('Purchase verification failed:', err);
                        Alert.alert('Error', 'Could not verify your purchase. Please contact support.');
                    } finally {
                        try {
                            await RNIap.finishTransaction({ purchase, isConsumable: false });
                        } catch (finishErr) {
                            console.warn('finishTransaction failed:', finishErr);
                        }
                    }
                });

                purchaseErrorSub = RNIap.purchaseErrorListener((error) => {
                    if (error.code !== 'E_USER_CANCELLED') {
                        Alert.alert('Purchase Error', error.message);
                    }
                });
            } catch (err) {
                console.error('IAP setup failed:', err);
            }
        };

        setupIap();

        return () => {
            purchaseUpdateSub?.remove();
            purchaseErrorSub?.remove();
            RNIap.endConnection().catch(() => {});
        };
    }, [token]);

    // ─── Initial load: poll REST on login ────────────────────────────────────
    useEffect(() => {
        checkStatus();
    }, [token]);

    // ─── Real-time listener: AppSync subscription ────────────────────────────
    useEffect(() => {
        // cognitoUsername in the schema is the Cognito sub (userId)
        const cognitoUsername = user?.userId;

        if (!token || !cognitoUsername) {
            // Clean up if not logged in
            if (appSyncSubRef.current) {
                appSyncSubRef.current.unsubscribe();
                appSyncSubRef.current = null;
            }
            return;
        }

        // Cancel any stale subscription before opening a new one
        if (appSyncSubRef.current) {
            appSyncSubRef.current.unsubscribe();
            appSyncSubRef.current = null;
        }

        console.log(`[AppSync] Subscribing to onUserUpdated for: ${cognitoUsername}`);

        const sub = client.graphql({
            query: ON_USER_UPDATED,
            variables: { cognitoUsername },
        }).subscribe({
            next: ({ data }) => {
                const updated = data?.onUserUpdated;
                if (updated) {
                    console.log('[AppSync] Real-time user update received:', updated);
                    const isPremium = updated.premiumUser === true;
                    setStatus(isPremium ? 'active' : 'none');
                    setSubscription({
                        status: updated.subscriptionStatus,
                        premiumUntil: updated.premiumUntil,
                    });
                }
            },
            error: (err) => {
                console.warn('[AppSync] Subscription error:', err);
            },
        });

        appSyncSubRef.current = sub;

        // Cleanup on logout or user change
        return () => {
            console.log('[AppSync] Unsubscribing from onUserUpdated');
            sub.unsubscribe();
            appSyncSubRef.current = null;
        };
    }, [token, user?.userId]);

    // ─── Auth event logging ──────────────────────────────────────────────────
    useEffect(() => {
        const currentEmail = user?.attributes?.email;

        if (token && status !== 'loading' && currentEmail && currentEmail !== lastLoggedEmail) {
            console.log(`[Auth] User logged in: ${currentEmail}, Premium User: ${status}`);
            setLastLoggedEmail(currentEmail);
        }

        if (!token && lastLoggedEmail) {
            console.log(`[Auth] User logged out: ${lastLoggedEmail}`);
            setLastLoggedEmail(null);
        }
    }, [token, status, user, lastLoggedEmail]);

    const requestPurchase = async (product) => {
        if (Platform.OS === 'android') {
            const offerToken = product?.subscriptionOfferDetails?.[0]?.offerToken;
            const params = offerToken
                ? { sku: product.productId, subscriptionOffers: [{ sku: product.productId, offerToken }] }
                : { sku: product.productId };
            await RNIap.requestSubscription(params);
        } else {
            await RNIap.requestSubscription({ sku: product.productId });
        }
    };

    return (
        <SubscriptionContext.Provider value={{ status, subscription, checkStatus, requestPurchase }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => useContext(SubscriptionContext);
