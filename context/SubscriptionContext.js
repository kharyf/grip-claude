import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { generateClient } from 'aws-amplify/api';
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

export const SubscriptionProvider = ({ children }) => {
    const { token, user } = useAuth();
    const [status, setStatus] = useState('none'); // 'none', 'active', 'loading'
    const [subscription, setSubscription] = useState(null);
    const [lastLoggedEmail, setLastLoggedEmail] = useState(null);
    const appSyncSubRef = useRef(null);

    const API_STAGE_URL = 'https://c0kjvdp5l5.execute-api.us-east-1.amazonaws.com/GripahAPIStage';

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

    return (
        <SubscriptionContext.Provider value={{ status, subscription, checkStatus }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => useContext(SubscriptionContext);
