import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileAds, { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { Amplify } from 'aws-amplify';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import SpendingTab from './components/SpendingTab';
import ChatTab from './components/ChatTab';
import SettingsTab from './components/SettingsTab';
import LoginScreen from './components/LoginScreen';

// Cognito User Pool configuration - simplified for native email/password auth
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_ep4c0DVRU',
      userPoolClientId: '2rbspi5nhednfsjhp7t2h3lcei',
    }
  }
};

// Configure Amplify with Cognito
try {
  console.log('Configuring Amplify with Cognito...');
  Amplify.configure(amplifyConfig);
  console.log('Amplify configured successfully');
} catch (e) {
  console.error('Amplify configuration failed:', e.name, e.message);
}

const STRIPE_PUBLISHABLE_KEY = "pk_test_51SlYj7AZmHfL53PCbuuW0PLizUDYeKeQ3Sc1yUidPMut2S9Tjof4ZfuRwAsihbfDDT2GOcUmyZUwYGvEFJCqU3O900rR2Dp5uO";

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
};

function AppContent() {
  const [activeTab, setActiveTab] = useState('Spending');
  const [menuVisible, setMenuVisible] = useState(false);
  const [chartType, setChartType] = useState('Pie');
  const [currency, setCurrency] = useState('USD');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Initialize Google Mobile Ads
    mobileAds()
      .initialize()
      .then(adapterStatuses => {
        console.log('Mobile Ads Initialized');
      });

    const loadCurrency = async () => {
      try {
        const savedCurrency = await AsyncStorage.getItem('currency');
        if (savedCurrency) {
          setCurrency(savedCurrency);
        }
      } catch (error) {
        console.error('Failed to load currency:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadCurrency();
  }, []);

  const handleCurrencyChange = async (newCurrency) => {
    setCurrency(newCurrency);
    try {
      await AsyncStorage.setItem('currency', newCurrency);
    } catch (error) {
      console.error('Failed to save currency:', error);
    }
  };

  const currencySymbol = CURRENCY_SYMBOLS[currency] || '$';

  const renderContent = () => {
    if (!isLoaded) return null;

    switch (activeTab) {
      case 'Spending':
        return <SpendingTab chartType={chartType} currencySymbol={currencySymbol} />;
      case 'Scanner':
        return <ChatTab currencySymbol={currencySymbol} />;
      case 'Settings':
        return (
          <SettingsTab
            currency={currency}
            onCurrencyChange={handleCurrencyChange}
          />
        );
      default:
        return <SpendingTab chartType={chartType} currencySymbol={currencySymbol} />;
    }
  };

  const {
    user,
    login,
    register,
    confirmAccount,
    forgotPassword,
    logout,
    isLoading,
    isAuthenticating,
    error: authError,
    needsConfirmation,
  } = useAuth();
  const { status } = useSubscription();

  const userEmail = user?.attributes?.email || user?.username || '';
  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : '👤';

  // Show loading screen during initial auth check
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.appTitle}>Gripah</Text>
        <Text style={[styles.tabText, { marginTop: 10 }]}>Loading...</Text>
      </View>
    );
  }

  // Show login screen if user is not authenticated
  if (!user) {
    return (
      <LoginScreen
        onLogin={login}
        onSignUp={register}
        onForgotPassword={forgotPassword}
        onConfirmAccount={confirmAccount}
        error={authError}
        isLoading={isAuthenticating}
        needsConfirmation={needsConfirmation}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* App Title */}
      <View style={styles.titleContainer}>
        <TouchableOpacity
          style={styles.userIconButton}
          onPress={() => setMenuVisible(true)}
        >
          <View style={styles.userIcon}>
            <Text style={styles.userIconText}>{userInitial}</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.appTitle}>Gripah</Text>
        <View style={styles.userIconPlaceholder} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Spending' && styles.activeTab]}
          onPress={() => setActiveTab('Spending')}
        >
          <Text style={[styles.tabText, activeTab === 'Spending' && styles.activeTabText]}>
            Spending
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'Scanner' && styles.activeTab]}
          onPress={() => setActiveTab('Scanner')}
        >
          <Text style={[styles.tabText, activeTab === 'Scanner' && styles.activeTabText]}>
            Scanner
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'Settings' && styles.activeTab]}
          onPress={() => setActiveTab('Settings')}
        >
          <Text style={[styles.tabText, activeTab === 'Settings' && styles.activeTabText]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Banner Ad - Only for free users */}
      {status !== 'active' && (
        <View style={styles.adContainer}>
          <BannerAd
            unitId={TestIds.BANNER}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
          />
        </View>
      )}

      {/* User Menu Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuItem}>
              <Text style={styles.menuIcon}>📧</Text>
              <Text style={styles.menuText} numberOfLines={1} ellipsizeMode="tail">
                {userEmail}
              </Text>
            </View>

            <View style={styles.menuItem}>
              <Text style={styles.menuIcon}>💎</Text>
              <Text style={styles.menuText}>
                {status === 'active' ? 'Premium User' : 'Free User'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => {
                setMenuVisible(false);
                logout();
              }}
            >
              <Text style={styles.menuIcon}>🚪</Text>
              <Text style={styles.menuText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
          <AppContent />
        </StripeProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2a2a2a',
  },
  titleContainer: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 5,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#32CD32',
  },
  userIconButton: {
    padding: 4,
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#32CD32',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  userIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  userIconPlaceholder: {
    width: 40,
    height: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#32CD32',
    letterSpacing: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#32CD32',
    backgroundColor: '#1a1a1a',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    borderRightWidth: 1,
    borderRightColor: '#32CD32',
    borderLeftWidth: 1,
    borderLeftColor: '#32CD32',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginTop: 4,
  },
  activeTab: {
    borderBottomColor: '#32CD32',
    backgroundColor: '#2a2a2a',
    borderTopWidth: 2,
    borderTopColor: '#32CD32',
  },
  tabText: {
    color: '#32CD32',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  adContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#32CD32',
    paddingVertical: 5,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  menuContainer: {
    backgroundColor: '#1a1a1a',
    marginTop: 80,
    marginLeft: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#32CD32',
    minWidth: 220,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#32CD32',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#32CD32',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#32CD32',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  loginButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
});
