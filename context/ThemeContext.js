import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserKey } from '../utils/userStorage';
import { useAuth } from './AuthContext';

const DEFAULT_THEME = {
  main: '#1a1a1a',       // Main: deep black backgrounds
  secondary: '#2a2a2a', // Secondary: charcoal container backgrounds
  trim: '#32CD32',       // Trim: lime green accents, borders, text
};

const STORAGE_KEY = 'appThemeColors';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.userId;
  const [theme, setTheme] = useState(DEFAULT_THEME);

  // Load persisted colors on mount or when userId changes
  useEffect(() => {
    const loadTheme = async () => {
      if (!userId) return; // Don't load if no user
      try {
        const saved = await AsyncStorage.getItem(getUserKey(userId, STORAGE_KEY));
        if (saved) {
          const parsed = JSON.parse(saved);
          setTheme({ ...DEFAULT_THEME, ...parsed });
        }
      } catch (e) {
        console.error('Failed to load theme:', e);
      }
    };
    loadTheme();
  }, [userId]);

  // Update one color role and persist, ensuring uniqueness via swap logic
  const setThemeColor = async (role, hex) => {
    setTheme(prev => {
      const updated = { ...prev };

      // Check if this hex is already used by another role
      const roles = ['main', 'secondary', 'trim'];
      const currentOwner = roles.find(r => r !== role && prev[r] === hex);

      if (currentOwner) {
        // Swap: Give the current owner this role's old color
        updated[currentOwner] = prev[role];
      }

      updated[role] = hex;

      // Persist the update
      if (userId) {
        AsyncStorage.setItem(getUserKey(userId, STORAGE_KEY), JSON.stringify(updated)).catch(e => {
          console.error('Failed to save theme:', e);
        });
      }

      return updated;
    });
  };

  // Reset to defaults
  const resetTheme = async () => {
    setTheme(DEFAULT_THEME);
    if (!userId) return;
    try {
      await AsyncStorage.removeItem(getUserKey(userId, STORAGE_KEY));
    } catch (e) {
      console.error('Failed to reset theme:', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setThemeColor, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};

export default ThemeContext;
