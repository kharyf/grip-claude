import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const ChatTab = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Hello! I\'m your AI assistant. How can I help you manage your spending. Try saying "Add $50 to Groceries" or "Remove the last item from Rent"!',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);

  const sendMessage = () => {
    if (inputText.trim() === '') return;

    const userMessage = {
      id: messages.length + 1,
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInputText('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        text: generateAIResponse(inputText),
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const generateAIResponse = (userInput) => {
    const input = userInput.toLowerCase();
    
    // Check for add/create spending commands
    if (input.includes('add') && (input.includes('to') || input.includes('$'))) {
      return 'I\'ve added that item to your spending. You can view it in the Spending tab!';
    }
    
    // Check for remove/delete commands
    if (input.includes('remove') || input.includes('delete')) {
      return 'I\'ve removed that item from your spending. Check the Spending tab to confirm.';
    }
    
    // Check for edit/update commands
    if (input.includes('edit') || input.includes('update') || input.includes('change')) {
      return 'I\'ve updated that spending item. The changes are reflected in the Spending tab.';
    }
    
    // Check for category creation
    if (input.includes('create category') || input.includes('new category')) {
      return 'I\'ve created that new spending category for you. You can now add items to it!';
    }
    
    // Default responses
    const responses = [
      'That\'s an interesting question! Based on your spending data, I can help you with that.',
      'I understand. Let me analyze your financial information.',
      'Great question! Your spending habits show some interesting patterns.',
      'I can help you with that. Would you like me to provide more details?',
      'Based on the data, here are some insights that might help you.',
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const startVoiceInput = () => {
    setIsListening(true);
    
    // Simulate voice recognition (in a real app, you'd use expo-speech or react-native-voice)
    setTimeout(() => {
      const sampleVoiceCommands = [
        'Add $50 to Groceries for Whole Foods',
        'Remove the last item from Entertainment',
        'Add $120 to Wisconsin Trip for hotel booking',
        'Create a new category called Fitness',
        'Add $25 to Dining Out for lunch',
      ];
      
      const randomCommand = sampleVoiceCommands[Math.floor(Math.random() * sampleVoiceCommands.length)];
      setInputText(randomCommand);
      setIsListening(false);
    }, 2000);
  };

  const parseReceipt = (imageUri) => {
    // Simulate receipt parsing with OCR
    // In a real app, you would use an OCR service like Google Vision API, AWS Textract, or a receipt parsing API
    
    // Simulated parsed data
    const receiptData = {
      merchant: ['Whole Foods', 'Target', 'Starbucks', 'Shell Gas', 'Amazon', 'Walmart'][Math.floor(Math.random() * 6)],
      amount: (Math.random() * 100 + 5).toFixed(2),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      category: null // Will be suggested based on merchant
    };

    // Suggest category based on merchant
    const categoryMap = {
      'Whole Foods': 'Groceries',
      'Target': 'Shopping',
      'Starbucks': 'Dining Out',
      'Shell Gas': 'Transportation',
      'Amazon': 'Shopping',
      'Walmart': 'Groceries'
    };

    receiptData.category = categoryMap[receiptData.merchant] || 'Groceries';

    return receiptData;
  };

  const handleCameraPress = async () => {
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
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Error accessing camera:', error);
      Alert.alert('Error', 'Failed to access camera. Please try again.');
    }
  };

  const processReceipt = (imageUri) => {
    // Show processing message
    const processingMessage = {
      id: Date.now(),
      text: 'Processing receipt... 📸',
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, processingMessage]);

    // Simulate processing time
    setTimeout(() => {
      const receiptData = parseReceipt(imageUri);
      
      // Add confirmation message
      const confirmationMessage = {
        id: Date.now() + 1,
        text: `I found a receipt from ${receiptData.merchant} for $${receiptData.amount} on ${receiptData.date}. I'll add this to your ${receiptData.category} category.`,
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev.filter(m => m.id !== processingMessage.id), confirmationMessage]);
      
      // In a real app, you would add this to the spending database
      // For now, just show a success message after a delay
      setTimeout(() => {
        const successMessage = {
          id: Date.now() + 2,
          text: `✅ Added $${receiptData.amount} to ${receiptData.category} for ${receiptData.merchant}. You can view it in the Spending tab!`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, successMessage]);
      }, 1000);
    }, 2000);
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
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
          placeholderTextColor="#666"
          multiline
          maxLength={500}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.cameraButton} 
          onPress={handleCameraPress}
        >
          <Text style={styles.cameraButtonText}>📷</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.micButton, isListening && styles.micButtonActive]} 
          onPress={startVoiceInput}
          disabled={isListening}
        >
          <Text style={styles.micButtonText}>{isListening ? '🎤' : '🎙️'}</Text>
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
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#32CD32',
    backgroundColor: '#1a1a1a',
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#32CD32',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#32CD32',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#32CD32',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginLeft: 8,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraButton: {
    backgroundColor: '#32CD32',
    borderRadius: 20,
    width: 44,
    height: 44,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButtonText: {
    fontSize: 24,
  },
  micButton: {
    backgroundColor: '#32CD32',
    borderRadius: 20,
    width: 44,
    height: 44,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: '#FF1493',
  },
  micButtonText: {
    fontSize: 24,
  },
});

export default ChatTab;
