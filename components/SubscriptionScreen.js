import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';

const API_URL = 'http://localhost:3000'; // Replace in production

const SubscriptionScreen = () => {
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const { user, token } = useAuth();
    const { checkStatus } = useSubscription();
    const [loading, setLoading] = useState(false);

    const fetchPaymentSheetParams = async () => {
        const response = await fetch(`${API_URL}/create-subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                email: user.email,
                priceId: 'price_YOUR_PRICE_ID', // Replace with actual Stripe Price ID
            }),
        });
        const { clientSecret, customer } = await response.json();

        return {
            paymentIntentClientSecret: clientSecret,
            customer,
        };
    };

    const subscribe = async () => {
        setLoading(true);
        const { paymentIntentClientSecret, customer } = await fetchPaymentSheetParams();

        const { error } = await initPaymentSheet({
            paymentIntentClientSecret,
            customerId: customer,
            merchantDisplayName: 'Gripah',
            allowsDelayedPaymentMethods: true,
        });

        if (!error) {
            const { sessionError } = await presentPaymentSheet();
            if (sessionError) {
                Alert.alert(`Error code: ${sessionError.code}`, sessionError.message);
            } else {
                Alert.alert('Success', 'Your subscription is active!');
                checkStatus();
            }
        } else {
            Alert.alert(`Error code: ${error.code}`, error.message);
        }
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Gripah Pro</Text>
            <Text style={styles.description}>Enjoy an ad-free experience and support the development of Gripah.</Text>
            <Text style={styles.price}>$9.99 / month</Text>

            <TouchableOpacity
                style={styles.subscribeButton}
                onPress={subscribe}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#1a1a1a" />
                ) : (
                    <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#32CD32',
        alignItems: 'center',
        margin: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#32CD32',
        marginBottom: 10,
    },
    description: {
        fontSize: 16,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 20,
    },
    price: {
        fontSize: 22,
        fontWeight: '800',
        color: '#32CD32',
        marginBottom: 25,
    },
    subscribeButton: {
        backgroundColor: '#32CD32',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        minWidth: 200,
        alignItems: 'center',
    },
    subscribeButtonText: {
        color: '#1a1a1a',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default SubscriptionScreen;
