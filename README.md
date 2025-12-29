# <span style="color: #32CD32;">Gripah</span>

<h1 align="center" style="color: #32CD32;">💰 Gripah</h1>

<p align="center">
  <strong>Your Personal Finance Companion</strong><br>
  Take control of your spending with AI-powered insights and smart budgeting tools
</p>

---

## 📱 About

**Gripah** is a modern personal finance application built with React Native and Expo. It helps you track your spending, manage budgets, and get AI-powered financial insights - all in one intuitive mobile app.

## ✨ Features

### 💸 Smart Spending Tracker
- **Receipt Scanning**: Use your camera to scan receipts and automatically extract spending details
- **Manual Entry**: Quick and easy manual transaction entry
- **Category Management**: Organize spending by customizable categories
- **Visual Analytics**: Beautiful charts and graphs to visualize your spending patterns
- **Time-based Views**: Track spending by day, week, month, or custom date ranges

### 🤖 AI Financial Assistant
- **Chat Interface**: Talk to your personal AI financial advisor
- **Smart Insights**: Get personalized advice based on your spending patterns
- **Context-Aware**: Understands your financial goals and provides relevant guidance
- **24/7 Availability**: Get financial help whenever you need it

### 🎯 Budget Management
- **Category Budgets**: Set spending limits for different categories
- **Visual Progress**: Track budget usage with intuitive progress bars
- **Smart Alerts**: Stay informed about your spending habits
- **Goal Setting**: Define and track your financial goals

### ⚙️ Customization
- **Flexible Settings**: Customize the app to match your needs
- **Data Management**: Import and export your financial data
- **Privacy First**: Your data stays on your device

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development) or Android Studio (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gripah
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on your platform**
   - **iOS**: `npm run ios`
   - **Android**: `npm run android`
   - **Web**: `npm run web`

## 🛠️ Technology Stack

- **Framework**: React Native with Expo SDK 54
- **UI Components**: React Native core components
- **Charts**: react-native-chart-kit
- **Camera**: expo-camera
- **Image Picker**: expo-image-picker
- **State Management**: React Hooks (useState)

## 📦 Project Structure

```
gripah/
├── App.js                 # Main application component with tab navigation
├── components/
├── ChatTab.js        # AI chat interface
├── SpendingTab.js    # Spending tracker and analytics
└── SettingsTab.js    # App settings and configuration
├── assets/               # Images, icons, and static resources
├── app.json             # Expo configuration
└── package.json         # Dependencies and scripts
```

## 🎨 Key Components

### Spending Tab
- Transaction management
- Receipt scanning with OCR
- Category-based filtering
- Interactive spending charts
- Date range analysis

### Chat Tab
- AI-powered financial assistant
- Natural language processing
- Contextual spending insights
- Personalized recommendations

### Settings Tab
- User preferences
- Budget configuration
- Data management
- App customization

## 📱 Platforms

- ✅ iOS
- ✅ Android
- ✅ Web

## 🔒 Permissions

The app requires the following permissions:
- **Camera**: For scanning receipts
- **Photo Library**: For selecting receipt images

## 🚢 Building for Production

### Web Build
```bash
npm run build
```

### iOS/Android Builds
Use Expo Application Services (EAS):
```bash
eas build --platform ios
eas build --platform android
```

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. For questions or suggestions, please contact the project maintainer.

---

<p align="center">
  Built with ❤️ using React Native and Expo
</p>
