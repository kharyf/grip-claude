import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Modal, Linking, Alert, Image, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserItem, setUserItem } from './utils/userStorage';
import mobileAds, { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Amplify } from 'aws-amplify';
import SpendingTab from './components/SpendingTab';
import ChatTab from './components/ChatTab';
import AutopayTab from './components/AutopayTab';
import SettingsTab from './components/SettingsTab';
import LoginScreen from './components/LoginScreen';

// Cognito User Pool configuration - simplified for native email/password auth
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_ep4c0DVRU',
      userPoolClientId: '2rbspi5nhednfsjhp7t2h3lcei',
    }
  },
  API: {
    GraphQL: {
      endpoint: 'https://vazdot6eijdnln5xjvfu2typge.appsync-api.us-east-1.amazonaws.com/graphql',
      region: 'us-east-1',
      defaultAuthMode: 'userPool', // Uses Cognito ID token automatically
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

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://gripahserver-98886831409.us-west1.run.app';
const FALLBACK_STRIPE_PUBLISHABLE_KEY = "pk_test_51SlYj7AZmHfL53PCbuuW0PLizUDYeKeQ3Sc1yUidPMut2S9Tjof4ZfuRwAsihbfDDT2GOcUmyZUwYGvEFJCqU3O900rR2Dp5uO";


const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
};

function AppContent() {
  const { theme } = useTheme();
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
  const { status, checkStatus } = useSubscription();

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
        if (!user?.userId) {
          setCurrency('USD');
          return;
        }
        const savedCurrency = await getUserItem(user?.userId, 'currency');
        if (savedCurrency) {
          setCurrency(savedCurrency);
        } else {
          setCurrency('USD');
        }
      } catch (error) {
        console.error('Failed to load currency:', error);
        setCurrency('USD');
      } finally {
        setIsLoaded(true);
      }
    };
    loadCurrency();
  }, [user?.userId]);

  const checkAutopays = async () => {
    if (!user?.userId) return;
    
    try {
      const lastCheck = await getUserItem(user.userId, 'lastAutopayCheckDate');
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      if (lastCheck === todayStr) return;
      
      const autopaysStr = await getUserItem(user.userId, 'autopays');
      const annualAutopaysStr = await getUserItem(user.userId, 'annualAutopays');
      
      const autopays = autopaysStr ? JSON.parse(autopaysStr) : [];
      const annualAutopays = annualAutopaysStr ? JSON.parse(annualAutopaysStr) : [];
      
      if (autopays.length === 0 && annualAutopays.length === 0) {
        await setUserItem(user.userId, 'lastAutopayCheckDate', todayStr);
        return;
      }
      
      const categoryItemsStr = await getUserItem(user.userId, 'categoryItems');
      let categoryItems = categoryItemsStr ? JSON.parse(categoryItemsStr) : {};
      
      let startDate;
      if (!lastCheck) {
        startDate = new Date(today);
      } else {
        startDate = new Date(lastCheck);
        startDate.setDate(startDate.getDate() + 1);
      }
      
      let currentProcessingDate = new Date(startDate);
      currentProcessingDate.setHours(0, 0, 0, 0);
      const comparisonToday = new Date(today);
      comparisonToday.setHours(0, 0, 0, 0);
      
      let modified = false;
      const monthMap = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
        'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
      };
      
      while (currentProcessingDate <= comparisonToday) {
        const dayOfMonth = currentProcessingDate.getDate();
        const year = currentProcessingDate.getFullYear();
        const monthIndex = currentProcessingDate.getMonth();
        const isLastDay = new Date(year, monthIndex + 1, 0).getDate() === dayOfMonth;
        
        const dateStr = currentProcessingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        // Process Monthly
        autopays.forEach(ap => {
          const shouldTrigger = (ap.day === dayOfMonth) || (ap.day > dayOfMonth && isLastDay);
          if (shouldTrigger) {
            const newItem = {
              id: `ap-${ap.id}-${currentProcessingDate.getTime()}`,
              name: ap.name,
              date: dateStr,
              amount: ap.amount,
              isBase: false,
            };
            if (!categoryItems[ap.category]) categoryItems[ap.category] = [];
            categoryItems[ap.category].push(newItem);
            modified = true;
          }
        });

        // Process Annual
        annualAutopays.forEach(ap => {
          const targetMonth = monthMap[ap.month];
          if (targetMonth === monthIndex) {
            const shouldTrigger = (ap.day === dayOfMonth) || (ap.day > dayOfMonth && isLastDay);
            if (shouldTrigger) {
              const newItem = {
                id: `aap-${ap.id}-${currentProcessingDate.getTime()}`,
                name: ap.name,
                date: dateStr,
                amount: ap.amount,
                isBase: false,
              };
              if (!categoryItems[ap.category]) categoryItems[ap.category] = [];
              categoryItems[ap.category].push(newItem);
              modified = true;
            }
          }
        });
        
        currentProcessingDate.setDate(currentProcessingDate.getDate() + 1);
      }
      
      if (modified) {
        await setUserItem(user.userId, 'categoryItems', JSON.stringify(categoryItems));
      }
      await setUserItem(user.userId, 'lastAutopayCheckDate', todayStr);
      
    } catch (e) {
      console.error('Failed to process autopays:', e);
    }
  };

  useEffect(() => {
    if (user?.userId && isLoaded) {
      checkAutopays();
      
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'active') {
          checkAutopays();
        }
      });
      
      return () => subscription.remove();
    }
  }, [user?.userId, isLoaded]);

  const handleCurrencyChange = async (newCurrency) => {
    setCurrency(newCurrency);
    try {
      await setUserItem(user?.userId, 'currency', newCurrency);
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
      case 'Autopays':
        return <AutopayTab />;
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

  useEffect(() => {
    const handleDeepLink = async ({ url }) => {
      console.log('Deep link received:', url);
      if (url) {
        try {
          const urlObj = new URL(url);
          const sessionId = urlObj.searchParams.get('session_id');

          if (url.includes('payment-success')) {
            console.log('Payment success detected', sessionId ? `Session: ${sessionId}` : '');
            // Wait a moment for webhook to process
            setTimeout(async () => {
              await checkStatus();
              Alert.alert(
                "Subscription Successful",
                "Thank you for subscribing! Your premium features are now active.",
                [{ text: "OK", onPress: () => setActiveTab('Settings') }]
              );
            }, 2000);
          } else if (url.includes('payment-cancel')) {
            const cancelReason = urlObj.searchParams.get('reason') || 'The subscription process was cancelled.';
            Alert.alert("Subscription Cancelled", cancelReason);
          } else if (sessionId) {
            // Handle any Stripe checkout session return
            console.log('Stripe session detected:', sessionId);
            setTimeout(() => checkStatus(), 1500);
          }
        } catch (error) {
          console.error('Error processing deep link:', error);
        }
      }
    };

    // Check for initial URL (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    }).catch(error => {
      console.error('Error getting initial URL:', error);
    });

    // Add listener (warm start)
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  const userEmail = user?.attributes?.email || user?.username || '';
  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : '👤';

  // Show loading screen during initial auth check
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.main, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.appTitle, { color: theme.trim }]}>Gripah</Text>
        <Text style={[styles.tabText, { color: theme.trim, marginTop: 10 }]}>Loading...</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.secondary }]}>
      <StatusBar style="light" />

      {/* App Title */}
      <View style={[styles.titleContainer, { backgroundColor: theme.main, borderBottomColor: theme.trim }]}>
        <TouchableOpacity
          style={styles.userIconButton}
          onPress={() => setMenuVisible(true)}
          testID="userMenuButton"
        >
          <View style={[styles.userIcon, { backgroundColor: theme.trim, borderColor: theme.main }]}>
            <Text style={[styles.userIconText, { color: theme.main }]}>{userInitial}</Text>
          </View>
        </TouchableOpacity>
        <Image
          source={require('./assets/GripahLogo.png')}
          style={styles.appLogo}
          resizeMode="contain"
        />
        <View style={styles.userIconPlaceholder} />
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { borderBottomColor: theme.trim, backgroundColor: theme.main }]}>
        <TouchableOpacity
          style={[styles.tab, { borderRightColor: theme.trim, borderLeftColor: theme.trim }, activeTab === 'Spending' && [styles.activeTab, { borderBottomColor: theme.trim, backgroundColor: theme.secondary, borderTopColor: theme.trim }]]}
          onPress={() => setActiveTab('Spending')}
        >
          <Text style={[styles.tabText, { color: theme.trim }, activeTab === 'Spending' && styles.activeTabText]}>
            Spending
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, { borderRightColor: theme.trim, borderLeftColor: theme.trim }, activeTab === 'Autopays' && [styles.activeTab, { borderBottomColor: theme.trim, backgroundColor: theme.secondary, borderTopColor: theme.trim }]]}
          onPress={() => setActiveTab('Autopays')}
        >
          <Text style={[styles.tabText, { color: theme.trim }, activeTab === 'Autopays' && styles.activeTabText]}>
            Autopays
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, { borderRightColor: theme.trim, borderLeftColor: theme.trim }, activeTab === 'Scanner' && [styles.activeTab, { borderBottomColor: theme.trim, backgroundColor: theme.secondary, borderTopColor: theme.trim }]]}
          onPress={() => setActiveTab('Scanner')}
        >
          <Text style={[styles.tabText, { color: theme.trim }, activeTab === 'Scanner' && styles.activeTabText]}>
            Scanner
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, { borderRightColor: theme.trim, borderLeftColor: theme.trim }, activeTab === 'Settings' && [styles.activeTab, { borderBottomColor: theme.trim, backgroundColor: theme.secondary, borderTopColor: theme.trim }]]}
          onPress={() => setActiveTab('Settings')}
        >
          <Text style={[styles.tabText, { color: theme.trim }, activeTab === 'Settings' && styles.activeTabText]}>
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
        <View style={[styles.adContainer, { backgroundColor: theme.main, borderTopColor: theme.trim }]}>
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
          <View style={[styles.menuContainer, { backgroundColor: theme.main, borderColor: theme.trim }]}>
            <View style={[styles.menuItem, { borderBottomColor: theme.trim }]}>
              <Text style={styles.menuIcon}>📧</Text>
              <Text style={[styles.menuText, { color: theme.trim }]} numberOfLines={1} ellipsizeMode="tail">
                {userEmail}
              </Text>
            </View>

            <View style={[styles.menuItem, { borderBottomColor: theme.trim }]}>
              <Text style={styles.menuIcon}>{status === 'active' ? '💎' : '👍'}</Text>
              <Text style={[styles.menuText, { color: theme.trim }]}>
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
              <Text style={[styles.menuText, { color: theme.trim }]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  const [stripePubKey, setStripePubKey] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      try {
        console.log(`Fetching Stripe config from server: ${API_URL}/stripe-config`);
        const response = await fetch(`${API_URL}/stripe-config`, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        if (data.publishableKey) {
          console.log('Stripe pub key loaded from server');
          setStripePubKey(data.publishableKey);
        } else {
          throw new Error('No publishable key in response');
        }
      } catch (error) {
        clearTimeout(timeoutId);
        const isTimeout = error.name === 'AbortError';
        console.warn(
          isTimeout
            ? 'Stripe config fetch timed out after 3s, using fallback'
            : `Failed to fetch Stripe config from server (${error.message || 'unknown error'}), using fallback`
        );
        setStripePubKey(FALLBACK_STRIPE_PUBLISHABLE_KEY);
      }
    };
    fetchConfig();
  }, []);

  if (!stripePubKey) {
    return (
      <View style={{ flex: 1, backgroundColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#32CD32', fontSize: 32, fontWeight: 'bold' }}>Gripah</Text>
        <Text style={{ color: '#32CD32', marginTop: 10 }}>Initializing...</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <SubscriptionProvider>
          <StripeProvider publishableKey={stripePubKey}>
            <AppContent />
          </StripeProvider>
        </SubscriptionProvider>
      </ThemeProvider>
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
    paddingVertical: 0,
    paddingHorizontal: 0,
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
  appLogo: {
    height: 65,
    width: 210,
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
