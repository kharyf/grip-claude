import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
    const { token, user } = useAuth();
    const [status, setStatus] = useState('none'); // 'none', 'active', 'loading'
    const [subscription, setSubscription] = useState(null);
    const [lastLoggedEmail, setLastLoggedEmail] = useState(null);

    const API_STAGE_URL = 'https://c0kjvdp5l5.execute-api.us-east-1.amazonaws.com/GripahAPIStage';

    const checkStatus = async () => {
        if (!token) {
            setStatus('none');
            setSubscription(null);
            return;
        }

        setStatus('loading');
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const email = user?.attributes?.email;
            const url = `${API_STAGE_URL}?email=${encodeURIComponent(email)}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error('Server unreachable or returned error');
            }

            const data = await response.json();
            // API Gateway returns premium_user field
            const isPremiumUser = data.premium_user === true || data.premium_user === 'true';
            setStatus(isPremiumUser ? 'active' : 'none');
            setSubscription(data.details || null);
        } catch (error) {
            // Log error but don't crash, and keep status at 'none'
            console.log('Subscription check skipped (server likely not reachable on this network):', error.message);
            setStatus('none');
        }
    };

    useEffect(() => {
        checkStatus();
    }, [token]);

    useEffect(() => {
        const currentEmail = user?.attributes?.email;

        // Login detected
        if (token && status !== 'loading' && currentEmail && currentEmail !== lastLoggedEmail) {
            console.log(`[Auth] User logged in: ${currentEmail}, Premium User: ${status}`);
            setLastLoggedEmail(currentEmail);
        }

        // Logout detected
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
