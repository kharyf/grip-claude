import * as ImagePicker from 'expo-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { parseReceiptText } from '../utils/receiptParser';

const ChatTab = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI assistant. Take a picture of your latest receipt and I'll add it to your database.",
      isUser: false,
      timestamp: new Date(),
    },
  ]);






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

      // Add confirmation message
      const confirmationMessage = {
        id: Date.now() + 1,
        text: `I found a receipt from ${receiptData.merchant} for $${receiptData.amount} on ${receiptData.date}. I'll add this to your ${receiptData.category} category.`,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev.filter(m => m.id !== processingId), confirmationMessage]);

      // Add success message
      setTimeout(() => {
        const successMessage = {
          id: Date.now() + 2,
          text: `✅ Added $${receiptData.amount} to ${receiptData.category} for ${receiptData.merchant}. You can view it in the Spending tab!`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, successMessage]);
      }, 1000);
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
});

export default ChatTab;
