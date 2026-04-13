import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import * as RNIap from 'react-native-iap';
import { useSubscription } from '../context/SubscriptionContext';

const IOS_PRODUCT_ID = process.env.EXPO_PUBLIC_IAP_PRODUCT_ID || 'com.loxodonta.gripah.premium.monthlypro';
const ANDROID_PRODUCT_ID = process.env.EXPO_PUBLIC_ANDROID_IAP_PRODUCT_ID || IOS_PRODUCT_ID;
const PRODUCT_ID = Platform.OS === 'android' ? ANDROID_PRODUCT_ID : IOS_PRODUCT_ID;

const SubscriptionScreen = () => {
    const { requestPurchase } = useSubscription();
    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState(null);
    const [productError, setProductError] = useState(false);

    useEffect(() => {
        const loadProduct = async () => {
            try {
                const subs = await RNIap.getSubscriptions({ skus: [PRODUCT_ID] });
                if (subs.length > 0) {
                    setProduct(subs[0]);
                } else {
                    console.warn('IAP: No subscriptions returned for SKU:', PRODUCT_ID);
                    setProductError(true);
                }
            } catch (err) {
                console.error('IAP product load failed:', err);
                setProductError(true);
            }
        };

        loadProduct();
    }, []);

    const subscribe = async () => {
        if (!product) {
            Alert.alert('Unavailable', 'Subscription product could not be loaded. Please try again later.');
            return;
        }
        setLoading(true);
        try {
            await requestPurchase(product);
            // Completion handled by purchaseUpdatedListener in SubscriptionContext
        } catch (err) {
            if (err.code !== 'E_USER_CANCELLED') {
                Alert.alert('Error', err.message);
            }
        } finally {
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
