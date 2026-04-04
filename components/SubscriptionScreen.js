import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import * as RNIap from 'react-native-iap';

const IOS_PRODUCT_ID = process.env.EXPO_PUBLIC_IAP_PRODUCT_ID || 'com.loxodonta.gripah.premium.monthly';
const ANDROID_PRODUCT_ID = process.env.EXPO_PUBLIC_ANDROID_IAP_PRODUCT_ID || IOS_PRODUCT_ID;
const PRODUCT_ID = Platform.OS === 'android' ? ANDROID_PRODUCT_ID : IOS_PRODUCT_ID;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://gripahserver-98886831409.us-west1.run.app';
const ANDROID_PACKAGE_NAME = 'com.loxodonta.gripah';

const SubscriptionScreen = () => {
    const { user, token } = useAuth();
    const { checkStatus } = useSubscription();
    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState(null);
    const [productError, setProductError] = useState(false);

    useEffect(() => {
        let purchaseUpdateSub;
        let purchaseErrorSub;

        const setup = async () => {
            try {
                await RNIap.initConnection();

                const subs = await RNIap.getSubscriptions({ skus: [PRODUCT_ID] });
                if (subs.length > 0) {
                    setProduct(subs[0]);
                } else {
                    console.warn('IAP: No subscriptions returned for SKU:', PRODUCT_ID);
                    setProductError(true);
                }

                purchaseUpdateSub = RNIap.purchaseUpdatedListener(async (purchase) => {
                    // iOS uses transactionReceipt; Android uses purchaseToken
                    const receiptOrToken = Platform.OS === 'android'
                        ? purchase.purchaseToken
                        : purchase.transactionReceipt;

                    if (!receiptOrToken) return;
                    try {
                        await verifyPurchase(receiptOrToken, purchase);
                        await RNIap.finishTransaction({ purchase, isConsumable: false });
                        await checkStatus();
                        Alert.alert('Success', 'Your subscription is now active!');
                    } catch (err) {
                        console.error('Purchase verification failed:', err);
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

    const verifyPurchase = async (receiptOrToken, purchase) => {
        const isAndroid = Platform.OS === 'android';
        const endpoint = isAndroid ? '/verify-google-iap' : '/verify-apple-iap';
        const body = isAndroid
            ? {
                purchaseToken: receiptOrToken,
                productId: purchase.productId,
                packageName: ANDROID_PACKAGE_NAME,
                cognitoId: user?.userId,
              }
            : {
                receiptData: receiptOrToken,
                cognitoId: user?.userId,
              };

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Purchase verification failed');
        }
        return response.json();
    };

    const subscribe = async () => {
        if (!product) {
            Alert.alert('Unavailable', 'Subscription product could not be loaded. Please try again later.');
            return;
        }
        setLoading(true);
        try {
            if (Platform.OS === 'android') {
                // Google Play Billing v5+ requires subscriptionOffers with offerToken
                const offerToken = product?.subscriptionOfferDetails?.[0]?.offerToken;
                const params = offerToken
                    ? { sku: PRODUCT_ID, subscriptionOffers: [{ sku: PRODUCT_ID, offerToken }] }
                    : { sku: PRODUCT_ID };
                await RNIap.requestSubscription(params);
            } else {
                await RNIap.requestSubscription({ sku: PRODUCT_ID });
            }
            // Completion handled by purchaseUpdatedListener
        } catch (err) {
            if (err.code !== 'E_USER_CANCELLED') {
                Alert.alert('Error', err.message);
            }
            setLoading(false);
        }
    };

    const getPriceDisplay = () => {
        if (!product) return '$2.99';
        if (Platform.OS === 'android') {
            // Android v5 pricing is inside subscriptionOfferDetails
            const formattedPrice = product.subscriptionOfferDetails?.[0]
                ?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice;
            return formattedPrice || product.localizedPrice || '$2.99';
        }
        return product.localizedPrice || '$2.99';
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Gripah Premium</Text>
            <Text style={styles.description}>Enjoy an ad-free experience and support the development of Gripah.</Text>
            <Text style={styles.price}>{getPriceDisplay()} / month</Text>

            <TouchableOpacity
                style={styles.subscribeButton}
                onPress={subscribe}
                disabled={loading || productError}
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
