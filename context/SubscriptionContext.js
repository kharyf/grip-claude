import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
    const { token } = useAuth();
    const [status, setStatus] = useState('none'); // 'none', 'active', 'loading'
    const [subscription, setSubscription] = useState(null);

    const API_URL = 'http://192.168.1.227:3000'; // Updated for device connectivity

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

            const response = await fetch(`${API_URL}/subscription-status`, {
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
            setStatus(data.status);
            setSubscription({
                status: data.stripeStatus,
                id: data.subscriptionId
            });
        } catch (error) {
            // Log error but don't crash, and keep status at 'none'
            console.log('Subscription check skipped (server likely not reachable on this network):', error.message);
            setStatus('none');
        }
    };

    useEffect(() => {
        checkStatus();
    }, [token]);

    return (
        <SubscriptionContext.Provider value={{ status, subscription, checkStatus }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => useContext(SubscriptionContext);
