import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
    const { token } = useAuth();
    const [status, setStatus] = useState('none'); // 'none', 'active', 'loading'
    const [subscription, setSubscription] = useState(null);

    const API_URL = 'http://localhost:3000'; // Replace with actual backend URL in production

    const checkStatus = async () => {
        if (!token) {
            setStatus('none');
            setSubscription(null);
            return;
        }

        setStatus('loading');
        try {
            const response = await fetch(`${API_URL}/subscription-status`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setStatus(data.status);
            setSubscription({
                status: data.stripeStatus,
                id: data.subscriptionId
            });
        } catch (error) {
            console.error('Failed to check subscription status:', error);
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
