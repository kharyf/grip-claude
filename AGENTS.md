# AGENTS.md - Gripah Development Guidelines

## Overview
This document provides comprehensive guidelines for agentic coding assistants working on the Gripah codebase. Gripah is a React Native personal finance application built with Expo SDK 54, featuring spending tracking, receipt scanning, AI financial insights, and subscription management. Uses Amazon Cognito for authentication and AWS Amplify for backend integration.

## Technology Stack

- **Framework**: React Native with Expo SDK 54 (React 19.1.0)
- **UI Components**: React Native core components
- **Charts**: react-native-chart-kit
- **Camera**: expo-camera
- **Image Picker**: expo-image-picker
- **State Management**: React Hooks (useState), Context API
- **Authentication**: Amazon Cognito with AWS Amplify
- **Ads**: Google Mobile Ads (react-native-google-mobile-ads)
- **Backend**: Express.js with Stripe integration

## Build, Lint, and Test Commands

### Development Server
- **Start Expo development server**: `npm start` or `expo start`
- **Run on iOS simulator**: `npm run ios` or `expo run:ios`
- **Run on Android emulator**: `npm run android` or `expo run:android`
- **Run web version**: `npm run web` or `expo start --web` (may have compatibility issues)

### Production Builds
- **Web build**: `npm run build` or `expo export --platform web`

### Backend Server
- **Start server**: `cd server && node index.js` (no dedicated start script)
- **No test suite configured** for backend - run manual testing

### Testing
- **No automated test framework** currently configured
- **Manual testing only** - test components by running the app and verifying functionality
- **Single test execution**: N/A (no test files exist)

### Linting and Type Checking
- **No linting tools** currently configured (ESLint, Prettier, etc.)
- **No type checking** configured (TypeScript not used, all JavaScript)
- **Code quality**: Manual review and following established patterns

## Code Style Guidelines

### General Conventions

#### File Structure
```
gripah/
├── App.js                    # Main app component with navigation
├── components/               # UI components (SpendingTab.js, ChatTab.js, etc.)
├── context/                  # React contexts (AuthContext.js, SubscriptionContext.js)
├── assets/                   # Static assets (images, icons)
├── server/                   # Backend API (Express.js)
└── package.json             # Dependencies and scripts
```

#### Naming Conventions
- **Components**: PascalCase (e.g., `SpendingTab`, `AuthProvider`)
- **Functions/Variables**: camelCase (e.g., `handleCurrencyChange`, `categoryItems`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `CURRENCY_SYMBOLS`, `STRIPE_PUBLISHABLE_KEY`)
- **Files**: PascalCase for components, camelCase for utilities (e.g., `SpendingTab.js`, `AuthContext.js`)

#### Import Organization
```javascript
// 1. React imports first
import React, { useState, useEffect } from 'react';

// 2. React Native core components
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

// 3. Third-party libraries (alphabetical)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PieChart } from 'react-native-chart-kit';

// 4. Local imports (relative paths)
import { AuthProvider, useAuth } from './context/AuthContext';
import SpendingTab from './components/SpendingTab';
```

### React Native Patterns

#### Component Structure
```javascript
const ComponentName = ({ prop1, prop2 = 'default' }) => {
  // State declarations at top
  const [state1, setState1] = useState(initialValue);
  const [state2, setState2] = useState(null);

  // Effects after state
  useEffect(() => {
    // Side effects
  }, [dependencies]);

  // Event handlers
  const handleEvent = () => {
    // Handler logic
  };

  // Render logic
  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <View style={styles.container}>
      {/* JSX */}
    </View>
  );
};
```

#### State Management
- **Local state**: useState for component-specific state
- **Global state**: Context API with custom hooks
- **Persistent data**: AsyncStorage for user preferences and app data
- **Subscription data**: Context providers wrapping the app

#### Error Handling
```javascript
// Async operations
const loadData = async () => {
  try {
    const data = await AsyncStorage.getItem('key');
    // Process data
  } catch (error) {
    console.error('Failed to load data:', error);
    // Handle error gracefully
  }
};

// Auth operations
try {
  await signInWithRedirect();
} catch (error) {
  setError('Authentication failed');
  console.error('Auth error:', error);
}
```

### Styling Conventions

#### StyleSheet Organization
```javascript
const styles = StyleSheet.create({
  // Container styles first
  container: {
    flex: 1,
    backgroundColor: '#2a2a2a',
  },

  // Component-specific styles
  button: {
    backgroundColor: '#32CD32',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },

  // Text styles
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#32CD32',
  },

  // Layout styles
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
```

#### Color Scheme
- **Primary**: `#32CD32` (lime green)
- **Background**: `#2a2a2a` (dark gray)
- **Surface**: `#1a1a1a` (darker gray)
- **Text**: `#32CD32` on dark backgrounds
- **Error**: `#FF3B30` (red)

#### Responsive Design
- Use `Dimensions` for screen-aware layouts
- Flexible layouts with `flex: 1`
- Platform-specific code when necessary:
```javascript
import { Platform } from 'react-native';

// Platform-specific styling
const platformStyles = Platform.select({
  ios: { fontFamily: 'System' },
  android: { fontFamily: 'Roboto' },
});
```

### Backend Patterns (Express.js)

#### Server Structure
```javascript
// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { auth } = require('express-oauth2-jwt-bearer');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Auth middleware
const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
  tokenSigningAlg: 'RS256'
});

// Routes
app.get('/', (req, res) => {
  res.send('Server running');
});

app.post('/protected-route', checkJwt, async (req, res) => {
  // Protected route logic
});

// Error handling
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
```

#### API Patterns
- **Authentication**: JWT tokens via Auth0
- **Error responses**: JSON format with error objects
- **Success responses**: JSON data or simple confirmation
- **Logging**: console.log/console.error for debugging

### Data Management

#### AsyncStorage Usage
```javascript
// Saving data
const saveData = async (key, data) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
};

// Loading data
const loadData = async (key) => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Failed to load ${key}:`, error);
    return null;
  }
};
```

#### Data Structure Examples
```javascript
// Spending categories
const categoryItems = {
  'Groceries': [
    { id: 'unique-id', name: 'Weekly groceries', date: 'Dec 20, 2024', amount: 85.50 }
  ],
  'Rent': [
    { id: 'unique-id-2', name: 'Monthly rent', date: 'Dec 1, 2024', amount: 1200.00 }
  ]
};

// User preferences
const userPrefs = {
  currency: 'USD',
  chartType: 'Pie',
  theme: 'dark'
};
```

### Security Considerations

#### Environment Variables
- **Frontend**: Sensitive keys in code (Stripe publishable key)
- **Backend**: All secrets in `.env` file
- **Never commit secrets** to version control

#### Authentication
- **Amplify Auth**: Cognito integration for user management
- **JWT validation**: Auth0 middleware for API protection
- **Secure contexts**: Use HTTPS in production

#### Data Privacy
- **Local storage**: User data stored locally on device
- **No data transmission**: App functions offline-first
- **Camera permissions**: Required for receipt scanning
- **Minimal data collection**: Only necessary user data

### Development Workflow

#### Component Development
1. **Plan the component**: Define props, state, and behavior
2. **Implement structure**: Basic JSX and styling
3. **Add functionality**: State management and event handlers
4. **Handle edge cases**: Loading states, errors, empty states
5. **Test manually**: Run app and verify on all platforms

#### Feature Implementation
1. **Understand requirements**: Review component interactions
2. **Implement core logic**: State management and data flow
3. **Add UI components**: Build interfaces with consistent styling
4. **Handle persistence**: Save/load data with AsyncStorage
5. **Test thoroughly**: Verify on iOS, Android, and web platforms

#### Code Review Checklist
- [ ] Consistent naming conventions
- [ ] Proper import organization
- [ ] Error handling for async operations
- [ ] Responsive design considerations
- [ ] Platform-specific code when needed
- [ ] State management best practices
- [ ] Security considerations addressed

### Common Patterns and Gotchas

#### State Updates
```javascript
// Correct: Functional updates for state based on previous state
setCategoryItems(prev => ({
  ...prev,
  [category]: [...prev[category], newItem]
}));
```

#### Modal Management
```javascript
const [modalVisible, setModalVisible] = useState(false);

// Correct: Close modal and reset state
const closeModal = () => {
  setModalVisible(false);
  setFormData(initialState);
};
```

#### AsyncStorage Migration
```javascript
// Handle data structure changes
const loadData = async () => {
  const saved = await AsyncStorage.getItem('data');
  if (saved) {
    let data = JSON.parse(saved);
    // Migration logic for old data formats
    if (data.oldField) {
      data.newField = data.oldField;
      delete data.oldField;
    }
    setData(data);
  }
};
```

### Performance Considerations

#### Component Optimization
- **Avoid unnecessary re-renders**: Use useCallback for event handlers
- **Large lists**: Consider virtualization for long transaction lists
- **Image optimization**: Compress and optimize receipt images
- **Bundle size**: Minimize third-party dependencies

#### Memory Management
- **Clean up subscriptions**: Remove listeners in useEffect cleanup
- **AsyncStorage limits**: Be mindful of storage size limits
- **Image handling**: Process and resize camera images appropriately

### Deployment and Production

#### Environment Setup
- **Development**: Local Expo development server
- **Staging**: Test builds on devices/emulators
- **Production**: Expo Application Services (EAS) builds

#### Build Configuration
- **app.json**: Expo configuration and permissions
- **Environment variables**: Separate configs for dev/staging/prod
- **Asset optimization**: Compress images and minimize bundle size

This document should be updated as the codebase evolves and new patterns emerge. Always reference existing code for consistency when implementing new features.</content>
<parameter name="filePath">/Users/kharyfiler/Documents/grip-claude/AGENTS.md