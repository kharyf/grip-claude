import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';

const STRIPE_PAYMENT_LINK = process.env.EXPO_PUBLIC_STRIPE_PAYMENT_LINK || 'https://buy.stripe.com/test_8x228qdqcg3lgeQ1xA3sI00';

const SubscriptionScreen = () => {
    const { user } = useAuth();
    const { checkStatus } = useSubscription();
    const [loading, setLoading] = useState(false);

    const subscribe = async () => {
        setLoading(true);
        try {
            const email = user?.attributes?.email;
            const paymentUrl = email
                ? `${STRIPE_PAYMENT_LINK}?locked_prefilled_email=${encodeURIComponent(email)}`
                : STRIPE_PAYMENT_LINK;

            const supported = await Linking.canOpenURL(paymentUrl);
            if (supported) {
                await Linking.openURL(paymentUrl);
                // After opening the link, we can't easily track completion directly in-app
                // without a deep link callback, but we can tell the user what to do.
                Alert.alert(
                    'Subscription',
                    'We are opening the Stripe payment page. Please complete your subscription there and return to the app.',
                    [{ text: 'OK', onPress: () => checkStatus() }]
                );
            } else {
                Alert.alert('Error', "Cannot open the payment link. Please check your internet connection.");
            }
        } catch (err) {
            Alert.alert('Error', err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };


    return (
        <View style={styles.container}>
            <Text style={styles.title}>Gripah Premium</Text>
            <Text style={styles.description}>Enjoy an ad-free experience and support the development of Gripah.</Text>
            <Text style={styles.price}>$2.99 / month</Text>

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
