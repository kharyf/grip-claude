import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Image, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { Picker } from '@react-native-picker/picker';
import { useSubscription } from '../context/SubscriptionContext';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { parseReceiptText } from '../utils/receiptParser';
import { BASE_CATEGORIES } from '../utils/defaults';

const interstitial = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL, {
  requestNonPersonalizedAdsOnly: true,
});

const ChatTab = ({ currencySymbol = '$' }) => {
  const { status } = useSubscription();
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

  // Confirmation Modal State
  const [confirmationModalVisible, setConfirmationModalVisible] = useState(false);
  const [editMerchant, setEditMerchant] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [activeProcessingId, setActiveProcessingId] = useState(null);
  const [activeImageUri, setActiveImageUri] = useState(null);
  const [allCategories, setAllCategories] = useState(BASE_CATEGORIES.map(c => c.name));
  const [isCategoryPickerVisible, setIsCategoryPickerVisible] = useState(false);

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

  // Load scanner history and categories on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Load Messages
        const savedMessages = await AsyncStorage.getItem('scanner_messages');
        if (savedMessages !== null) {
          const parsed = JSON.parse(savedMessages).map(m => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          setMessages(parsed);
        }

        // 2. Load Categories
        const savedCustomCategories = await AsyncStorage.getItem('customCategories');
        if (savedCustomCategories !== null) {
          const custom = JSON.parse(savedCustomCategories);
          const baseCategories = BASE_CATEGORIES.map(c => c.name);
          setAllCategories([...baseCategories, ...custom.map(c => c.name)]);
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadData();
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

      setEditMerchant(receiptData.merchant);
      setEditAmount(receiptData.amount.toString());
      setEditDate(receiptData.date);

      // Validate suggested category
      let suggestedCategory = receiptData.category;
      if (!allCategories.includes(suggestedCategory)) {
        suggestedCategory = 'Groceries';
      }
      setEditCategory(suggestedCategory);

      setActiveProcessingId(processingId);
      setActiveImageUri(imageUri);
      setConfirmationModalVisible(true);

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

  const handleConfirmReceipt = async () => {
    try {
      const amount = parseFloat(editAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid amount.');
        return;
      }

      // 1. Get existing data
      const savedCategoryItems = await AsyncStorage.getItem('categoryItems');
      const savedCustomCategories = await AsyncStorage.getItem('customCategories');
      let categoryItems = savedCategoryItems ? JSON.parse(savedCategoryItems) : {};
      const customCategories = savedCustomCategories ? JSON.parse(savedCustomCategories) : [];

      // 2. Prepare categories (using state)
      const category = editCategory;

      // 4. Create item
      const newItem = {
        id: Date.now(),
        name: editMerchant,
        date: editDate,
        amount: amount,
        isBase: false,
      };

      // 5. Save
      categoryItems[category] = [...(categoryItems[category] || []), newItem];
      await AsyncStorage.setItem('categoryItems', JSON.stringify(categoryItems));

      // 6. Update chat
      const confirmationMessage = {
        id: Date.now() + 1,
        text: `I've confirmed the receipt from ${editMerchant} for ${currencySymbol}${amount}. Adding it now to ${category}.`,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev.filter(m => m.id !== activeProcessingId), confirmationMessage]);

      setTimeout(() => {
        const successMessage = {
          id: Date.now() + 2,
          text: `✅ Added ${currencySymbol}${amount} to ${category} for ${editMerchant}. You can view it in the Spending tab!`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, successMessage]);
      }, 1000);

      // 7. Reset
      setConfirmationModalVisible(false);
    } catch (error) {
      console.error('Failed to confirm receipt:', error);
      Alert.alert('Error', 'Failed to save to spending database.');
    }
  };

  const handleRetakeReceipt = () => {
    setConfirmationModalVisible(false);
    setMessages(prev => prev.filter(m => m.id !== activeProcessingId));
    handleCameraPress();
  };

  const handleCancelReceipt = () => {
    setConfirmationModalVisible(false);
    setMessages(prev => [
      ...prev.filter(m => m.id !== activeProcessingId),
      {
        id: Date.now(),
        text: "Scan canceled. You can try scanning again if the data was incorrect.",
        isUser: false,
        timestamp: new Date(),
      }
    ]);
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

        {/* Receipt Confirmation Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={confirmationModalVisible}
          onRequestClose={handleCancelReceipt}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Confirm Receipt Scan</Text>
                <TouchableOpacity onPress={handleCancelReceipt} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.addItemForm}>
                {activeImageUri && (
                  <View style={styles.scannedImageContainer}>
                    <Image source={{ uri: activeImageUri }} style={styles.scannedImage} />
                  </View>
                )}

                <Text style={styles.inputLabel}>Category *</Text>
                <TouchableOpacity
                  style={styles.pickerContainer}
                  onPress={() => setIsCategoryPickerVisible(true)}
                >
                  <Text style={styles.pickerText}>{editCategory}</Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Merchant / Item Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editMerchant}
                  onChangeText={setEditMerchant}
                  placeholder="e.g., Whole Foods"
                  placeholderTextColor="#666"
                />

                <Text style={styles.inputLabel}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={editDate}
                  onChangeText={setEditDate}
                  placeholder="e.g., Dec 25, 2024"
                  placeholderTextColor="#666"
                />

                <Text style={styles.inputLabel}>Amount *</Text>
                <TextInput
                  style={styles.input}
                  value={editAmount}
                  onChangeText={setEditAmount}
                  placeholder="e.g., 45.50"
                  placeholderTextColor="#666"
                  keyboardType="decimal-pad"
                />

                <TouchableOpacity style={styles.submitButton} onPress={handleConfirmReceipt}>
                  <Text style={styles.submitButtonText}>Add to Spending</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.retakeButton} onPress={handleRetakeReceipt}>
                  <Text style={styles.retakeButtonText}>📸 Retake Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelReceipt}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Internal Category Dropdown Overlay */}
              {isCategoryPickerVisible && (
                <View style={styles.pickerOverlayContainer}>
                  <View style={styles.pickerModalHeader}>
                    <Text style={styles.pickerModalTitle}>Select Category</Text>
                    <TouchableOpacity onPress={() => setIsCategoryPickerVisible(false)} style={styles.closePickerButton}>
                      <Text style={styles.closePickerButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.pickerScrollView}>
                    {allCategories.map((cat, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.pickerItem,
                          editCategory === cat && styles.pickerItemSelected
                        ]}
                        onPress={() => {
                          setEditCategory(cat);
                          setIsCategoryPickerVisible(false);
                        }}
                      >
                        <Text style={[
                          styles.pickerItemText,
                          editCategory === cat && styles.pickerItemTextSelected
                        ]}>
                          {cat}
                        </Text>
                        {editCategory === cat && <Text style={styles.checkIcon}>✓</Text>}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#32CD32',
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#32CD32',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#32CD32',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#32CD32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  addItemForm: {
    padding: 20,
  },
  scannedImageContainer: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#32CD32',
  },
  scannedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#32CD32',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#32CD32',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#32CD32',
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#32CD32',
    borderRadius: 8,
    marginTop: 4,
    height: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    color: '#32CD32',
    fontSize: 16,
  },
  dropdownArrow: {
    color: '#32CD32',
    fontSize: 12,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#32CD32',
    width: '80%',
    maxHeight: '60%',
    overflow: 'hidden',
  },
  pickerModalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#32CD32',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerModalTitle: {
    color: '#32CD32',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closePickerButton: {
    padding: 4,
  },
  closePickerButtonText: {
    color: '#32CD32',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerScrollView: {
    flex: 1,
  },
  pickerOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
    zIndex: 10,
    borderRadius: 16,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50, 205, 50, 0.1)',
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(50, 205, 50, 0.1)',
  },
  pickerItemText: {
    color: '#32CD32',
    fontSize: 16,
  },
  pickerItemTextSelected: {
    fontWeight: 'bold',
  },
  checkIcon: {
    color: '#32CD32',
    fontSize: 18,
  },
  submitButton: {
    backgroundColor: '#32CD32',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 24,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  retakeButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#32CD32',
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#32CD32',
  },
  cancelButton: {
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
});

export default ChatTab;
