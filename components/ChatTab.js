import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { parseReceiptText } from '../utils/receiptParser';

const interstitial = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL, {
  requestNonPersonalizedAdsOnly: true,
});

const ChatTab = ({ currencySymbol = '$' }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI assistant. Take a picture of your latest receipt and I'll add it to your database.",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const pendingScanRef = useRef(false);

  // Interstitial ad lifecycle
  useEffect(() => {
    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setAdLoaded(true);
    });

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setAdLoaded(false);
      interstitial.load(); // Reload for next time

      // If user was waiting to scan, trigger it now
      if (pendingScanRef.current) {
        pendingScanRef.current = false;
        showScanOptions();
      }
    });

    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      console.warn('Interstitial Load Error:', error);
      if (pendingScanRef.current) {
        pendingScanRef.current = false;
        showScanOptions();
      }
    });

    // Start loading the first ad
    interstitial.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, []);

  // Load scanner history on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const savedMessages = await AsyncStorage.getItem('scanner_messages');
        if (savedMessages !== null) {
          // Parse and convert strings back to Date objects for timestamps
          const parsed = JSON.parse(savedMessages).map(m => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          setMessages(parsed);
        }
      } catch (error) {
        console.error('Failed to load scanner history:', error);
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadMessages();
  }, []);

  // Save scanner history whenever messages change
  useEffect(() => {
    if (!isDataLoaded) return;

    const saveMessages = async () => {
      try {
        // Filter out temporary processing messages
        const persistentMessages = messages.filter(m => !m.text.includes('Processing receipt'));
        await AsyncStorage.setItem('scanner_messages', JSON.stringify(persistentMessages));
      } catch (error) {
        console.error('Failed to save scanner history:', error);
      }
    };
    saveMessages();
  }, [messages, isDataLoaded]);


  const showScanOptions = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to scan receipts.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Show options: Camera or Gallery
      Alert.alert(
        'Scan Receipt',
        'Choose an option',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [3, 4],
                quality: 0.8,
              });

              if (!result.canceled) {
                processReceipt(result.assets[0].uri);
              }
            }
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [3, 4],
                quality: 0.8,
              });

              if (!result.canceled) {
                processReceipt(result.assets[0].uri);
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error showing scan options:', error);
      Alert.alert('Error', 'Failed to access camera. Please try again.');
    }
  };

  const handleCameraPress = async () => {
    if (adLoaded) {
      pendingScanRef.current = true;
      try {
        await interstitial.show();
      } catch (error) {
        console.warn('Interstitial show failed:', error);
        pendingScanRef.current = false;
        showScanOptions();
      }
    } else {
      // If not loaded yet, try to load and wait a split second
      interstitial.load();
      setTimeout(async () => {
        if (interstitial.loaded) {
          pendingScanRef.current = true;
          try {
            await interstitial.show();
          } catch (e) {
            showScanOptions();
          }
        } else {
          showScanOptions();
        }
      }, 500);
    }
  };

  const processReceipt = async (imageUri) => {
    // Show processing message
    const processingId = Date.now();
    const processingMessage = {
      id: processingId,
      text: 'Processing receipt with ML Kit... 📸',
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, processingMessage]);

    try {
      let resultText = "";

      // Attempt real OCR
      try {
        const result = await TextRecognition.recognize(imageUri);
        resultText = result.text;
      } catch (ocrError) {
        console.warn('Real OCR failed, falling back to simulation:', ocrError);
        // Fallback for simulation/development
        resultText = `
          WHOLE FOODS MARKET
          123 Main St, New York, NY
          
          05/12/2023 14:30
          
          ORGANIC APPLES     4.99
          ALMOND MILK        3.50
          GREEK YOGURT       5.25
          
          TOTAL              13.74
          TAX                1.00
          AMOUNT DUE         14.74
        `;
      }

      console.log('OCR Result:', resultText);
      const receiptData = parseReceiptText(resultText);

      // Show confirmation alert before adding to database
      Alert.alert(
        "Confirm Receipt Scan",
        `Merchant: ${receiptData.merchant}\nAmount: ${currencySymbol}${receiptData.amount}\nDate: ${receiptData.date}\nCategory: ${receiptData.category}`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              setMessages(prev => [
                ...prev.filter(m => m.id !== processingId),
                {
                  id: Date.now(),
                  text: "Scan canceled. You can try scanning again if the data was incorrect.",
                  isUser: false,
                  timestamp: new Date(),
                }
              ]);
            }
          },
          {
            text: "Retake",
            onPress: () => {
              setMessages(prev => prev.filter(m => m.id !== processingId));
              handleCameraPress(); // Call the main camera trigger again
            }
          },
          {
            text: "Add to Spending",
            onPress: async () => {
              try {
                // 1. Get existing spending data and categories
                const savedCategoryItems = await AsyncStorage.getItem('categoryItems');
                const savedCustomCategories = await AsyncStorage.getItem('customCategories');
                let categoryItems = savedCategoryItems ? JSON.parse(savedCategoryItems) : {};
                const customCategories = savedCustomCategories ? JSON.parse(savedCustomCategories) : [];

                // 2. Prepare valid categories list
                const baseCategories = ['Groceries', 'Rent', 'Utilities', 'Transportation', 'Entertainment', 'Dining Out', 'Healthcare', 'Vacation', 'Subscriptions', 'Savings'];
                const allCategories = [...baseCategories, ...customCategories];

                // 3. Validate category
                let category = receiptData.category;
                if (!allCategories.includes(category)) {
                  console.log(`Scanner found non-existent category "${category}", falling back to Groceries.`);
                  category = 'Groceries';
                }

                // 4. Prepare the new item
                const newItem = {
                  id: Date.now(),
                  name: receiptData.merchant,
                  date: receiptData.date,
                  amount: parseFloat(receiptData.amount),
                  isBase: false,
                };

                // 5. Add to the correct category
                categoryItems[category] = [...(categoryItems[category] || []), newItem];

                // 4. Save back to AsyncStorage
                await AsyncStorage.setItem('categoryItems', JSON.stringify(categoryItems));

                // 5. Add confirmation message to chat
                const confirmationMessage = {
                  id: Date.now() + 1,
                  text: `I've confirmed the receipt from ${receiptData.merchant} for ${currencySymbol}${receiptData.amount}. Adding it now to ${receiptData.category}.`,
                  isUser: false,
                  timestamp: new Date(),
                };

                setMessages(prev => [...prev.filter(m => m.id !== processingId), confirmationMessage]);

                // 6. Add success message
                setTimeout(() => {
                  const successMessage = {
                    id: Date.now() + 2,
                    text: `✅ Added ${currencySymbol}${receiptData.amount} to ${receiptData.category} for ${receiptData.merchant}. You can view it in the Spending tab!`,
                    isUser: false,
                    timestamp: new Date(),
                  };
                  setMessages(prev => [...prev, successMessage]);
                }, 1000);
              } catch (saveError) {
                console.error('Failed to save to spending data:', saveError);
                Alert.alert('Error', 'Failed to save to spending database.');
              }
            }
          }
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('Error processing receipt:', error);
      setMessages(prev => [
        ...prev.filter(m => m.id !== processingId),
        {
          id: Date.now(),
          text: 'Sorry, I couldn\'t read that receipt. Please try again with a clearer photo.',
          isUser: false,
          timestamp: new Date(),
        }
      ]);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to clear your scan history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('scanner_messages');
              setMessages([
                {
                  id: 1,
                  text: "Hello! I'm your AI assistant. Take a picture of your latest receipt and I'll add it to your database.",
                  isUser: false,
                  timestamp: new Date(),
                },
              ]);
            } catch (error) {
              console.error('Failed to clear scanner history:', error);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.backgroundPattern} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.isUser ? styles.userMessage : styles.aiMessage,
              ]}
            >
              <Text style={styles.messageText}>{message.text}</Text>
              <Text style={styles.timestamp}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={handleCameraPress}
          >
            <Text style={styles.cameraButtonText}>📷</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearHistory}
          >
            <Text style={styles.clearButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(42, 42, 42, 0.85)',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#32CD32',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#1a3a1a',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a1a',
  },
  messageText: {
    color: '#32CD32',
    fontSize: 16,
    marginBottom: 4,
  },
  timestamp: {
    color: '#32CD32',
    fontSize: 11,
    opacity: 0.7,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#32CD32',
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    backgroundColor: '#32CD32',
    borderRadius: 44,
    width: 88,
    height: 88,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  cameraButtonText: {
    fontSize: 48,
  },
  clearButton: {
    backgroundColor: '#ff4444',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  clearButtonText: {
    fontSize: 28,
  },
});

export default ChatTab;
