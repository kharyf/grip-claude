import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import * as RNIap from 'react-native-iap';

const IAP_PRODUCT_ID = process.env.EXPO_PUBLIC_IAP_PRODUCT_ID || 'com.loxodonta.gripah.premium.monthly';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://gripahserver-98886831409.us-west1.run.app';

const SubscriptionScreen = () => {
    const { user, token } = useAuth();
    const { checkStatus } = useSubscription();
    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState(null);

    useEffect(() => {
        let purchaseUpdateSub;
        let purchaseErrorSub;

        const setup = async () => {
            try {
                await RNIap.initConnection();

                const subs = await RNIap.getSubscriptions({ skus: [IAP_PRODUCT_ID] });
                if (subs.length > 0) setProduct(subs[0]);

                purchaseUpdateSub = RNIap.purchaseUpdatedListener(async (purchase) => {
                    const receipt = purchase.transactionReceipt;
                    if (!receipt) return;
                    try {
                        await verifyReceipt(receipt);
                        await RNIap.finishTransaction({ purchase, isConsumable: false });
                        await checkStatus();
                        Alert.alert('Success', 'Your subscription is now active!');
                    } catch (err) {
                        console.error('Receipt verification failed:', err);
                        Alert.alert('Error', 'Could not verify your purchase. Please contact support.');
                    } finally {
                        setLoading(false);
                    }
                });

                purchaseErrorSub = RNIap.purchaseErrorListener((error) => {
                    if (error.code !== 'E_USER_CANCELLED') {
                        Alert.alert('Purchase Error', error.message);
                    }
                    setLoading(false);
                });
            } catch (err) {
                console.error('IAP setup failed:', err);
            }
        };

        setup();

        return () => {
            purchaseUpdateSub?.remove();
            purchaseErrorSub?.remove();
            RNIap.endConnection();
        };
    }, []);

    const verifyReceipt = async (receiptData) => {
        const response = await fetch(`${API_URL}/verify-apple-iap`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                receiptData,
                cognitoId: user?.userId,
            }),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Receipt verification failed');
        }
        return response.json();
    };

    const subscribe = async () => {
        setLoading(true);
        try {
            await RNIap.requestSubscription({ sku: IAP_PRODUCT_ID });
            // Completion handled by purchaseUpdatedListener
        } catch (err) {
            if (err.code !== 'E_USER_CANCELLED') {
                Alert.alert('Error', err.message);
            }
            setLoading(false);
        }
    };

    const priceDisplay = product?.localizedPrice || '$2.99';

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Gripah Premium</Text>
            <Text style={styles.description}>Enjoy an ad-free experience and support the development of Gripah.</Text>
            <Text style={styles.price}>{priceDisplay} / month</Text>

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
