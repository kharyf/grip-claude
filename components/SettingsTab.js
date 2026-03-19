import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUserItem } from '../utils/userStorage';
import { Picker } from '@react-native-picker/picker';
import { getDefaultCategoryItems } from '../utils/defaults';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import SubscriptionScreen from './SubscriptionScreen';

const ALL_SWATCHES = [
  '#0d0d0d', '#1a1a1a', '#2c2c2c', '#3d3d3d',
  '#1a0a2e', '#0a1a2e', '#0a2e1a', '#2e0a1a',
  '#1f1f1f', '#2a2a2a', '#333333', '#3f3f3f',
  '#1e2a1e', '#1e1e2e', '#2e2e1e', '#2e1e1e',
  '#32CD32', '#00BFFF', '#FF6B35', '#FFD700',
  '#FF3CAC', '#A78BFA', '#00E5CC', '#FFFFFF',
  '#FF4444', '#FFA500', '#4FC3F7', '#80CBC4',
];

const COLOR_ROLES = [
  { key: 'main', label: 'Main Color', description: 'Primary backgrounds', swatches: ALL_SWATCHES },
  { key: 'secondary', label: 'Secondary Color', description: 'Container & card backgrounds', swatches: ALL_SWATCHES },
  { key: 'trim', label: 'Trim Color', description: 'Accents, borders & text', swatches: ALL_SWATCHES },
];

const SettingsTab = ({ currency, onCurrencyChange }) => {
  const { user, logout } = useAuth();
  const userId = user?.userId;
  const { status, subscription } = useSubscription();
  const { theme, setThemeColor, resetTheme } = useTheme();

  // Options
  const [resetModalVisible, setResetModalVisible] = useState(false);

  // Theme picker state: which role is expanded
  const [expandedColorRole, setExpandedColorRole] = useState(null);

  const handleResetDatabase = async () => {
    try {
      if (!userId) return;
      const defaultItems = getDefaultCategoryItems();
      await setUserItem(userId, 'categoryItems', JSON.stringify(defaultItems));
      await setUserItem(userId, 'customCategories', JSON.stringify([]));
      setResetModalVisible(false);
      Alert.alert('Success', 'Database has been reset. Please restart the app or navigate back to Spending tab to see changes.');
    } catch (error) {
      console.error('Failed to reset database:', error);
      Alert.alert('Error', 'Failed to reset database.');
    }
  };

  const handleResetTheme = () => {
    Alert.alert(
      'Reset Theme',
      'Restore all colors to the original black & lime defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', onPress: resetTheme },
      ]
    );
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.main }]}>
      <View style={[styles.backgroundPattern, { backgroundColor: theme.main }]} />
      <ScrollView style={[styles.container, { backgroundColor: `${theme.secondary}D9` }]}>
        {/* ── Theme Customization ── */}
        <View style={[styles.section, { borderBottomColor: theme.trim }]}>
          <Text style={[styles.sectionTitle, { color: theme.trim }]}>Theme</Text>
          <Text style={[styles.settingDescription, { color: theme.trim, marginBottom: 16 }]}>
            Customize the three core app colors live.
          </Text>

          {COLOR_ROLES.map(({ key, label, description, swatches }) => {
            const currentColor = theme[key];
            const isExpanded = expandedColorRole === key;
            const roles = ['main', 'secondary', 'trim'];

            return (
              <View key={key} style={[styles.themeRow, { borderBottomColor: theme.main }]}>
                {/* Row header */}
                <TouchableOpacity
                  style={styles.themeRowHeader}
                  onPress={() => setExpandedColorRole(isExpanded ? null : key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.themeColorDot, { backgroundColor: currentColor, borderColor: theme.trim }]} />
                  <View style={styles.themeRowInfo}>
                    <Text style={[styles.settingLabel, { color: theme.trim }]}>{label}</Text>
                    <Text style={[styles.settingDescription, { color: theme.trim }]}>{description}</Text>
                  </View>
                  <Text style={[styles.themeChevron, { color: theme.trim }]}>{isExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {/* Swatch grid */}
                {isExpanded && (
                  <View style={styles.swatchGrid}>
                    {swatches.map((hex) => {
                      const isSelf = hex === currentColor;
                      const otherRole = roles.find(r => r !== key && theme[r] === hex);
                      const isOther = !!otherRole;

                      return (
                        <TouchableOpacity
                          key={hex}
                          onPress={() => {
                            setThemeColor(key, hex);
                            setExpandedColorRole(null);
                          }}
                          style={[
                            styles.swatch,
                            { backgroundColor: hex, borderColor: isSelf ? theme.trim : 'transparent' },
                          ]}
                          activeOpacity={0.75}
                        >
                          {isSelf && (
                            <Text style={[styles.swatchCheck, { color: key === 'trim' && hex === '#FFFFFF' ? '#1a1a1a' : theme.trim }]}>✓</Text>
                          )}
                          {isOther && !isSelf && (
                            <View style={[styles.swatchSwapIndicator, { backgroundColor: theme.trim }]}>
                              <Text style={[styles.swatchSwapIndicatorText, { color: theme.main }]}>⇄</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}

          {/* Reset theme button */}
          <TouchableOpacity
            style={[styles.resetThemeButton, { borderColor: theme.trim }]}
            onPress={handleResetTheme}
          >
            <Text style={[styles.resetThemeButtonText, { color: theme.trim }]}>↺  Reset to Defaults</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { borderBottomColor: theme.trim }]}>
          <Text style={[styles.sectionTitle, { color: theme.trim }]}>Preferences</Text>

          {/* Dropdown 1: Currency */}
          <View style={[styles.settingItem, { borderBottomColor: theme.main }]}>
            <View style={[styles.disclaimerContainer, { backgroundColor: theme.main, borderLeftColor: theme.trim }]}>
              <Text style={[styles.disclaimerText, { color: theme.trim }]}>
                Note: Currency change is visual only; no exchange rate calculations are performed.
              </Text>
            </View>
            <Text style={[styles.settingLabel, { color: theme.trim }]}>Currency</Text>
            <View style={[styles.pickerContainer, { borderColor: theme.trim, backgroundColor: theme.main }]}>
              <Picker
                selectedValue={currency}
                onValueChange={onCurrencyChange}
                style={styles.picker}
                dropdownIconColor={theme.trim}
              >
                <Picker.Item label="US Dollar (USD)" value="USD" color={theme.trim} />
                <Picker.Item label="Euro (EUR)" value="EUR" color={theme.trim} />
                <Picker.Item label="British Pound (GBP)" value="GBP" color={theme.trim} />
                <Picker.Item label="Japanese Yen (JPY)" value="JPY" color={theme.trim} />
                <Picker.Item label="Canadian Dollar (CAD)" value="CAD" color={theme.trim} />
              </Picker>
            </View>
          </View>
        </View>

        {/* Subscription Section */}
        <View style={[styles.section, { borderBottomColor: theme.trim }]}>
          <Text style={[styles.sectionTitle, { color: theme.trim }]}>Subscription</Text>
          {status === 'active' ? (
            <Text style={[styles.settingDescription, { color: theme.trim }]}>You are currently enjoying a Premium ad-free experience.</Text>
          ) : (
            <Text style={[styles.settingDescription, { color: theme.trim }]}>Upgrade to Premium to remove all advertisements from the app.</Text>
          )}
          <View style={[styles.settingItem, { marginTop: 10, borderBottomColor: theme.main }]}>
            <Text style={[styles.settingLabel, { color: theme.trim }]}>Status</Text>
            <Text style={[
              styles.statusText,
              status === 'active' ? styles.activeStatus : (subscription?.status === 'past_due' ? styles.warningStatus : styles.inactiveStatus)
            ]}>
              {status === 'active' ? 'Premium' : (subscription?.status === 'past_due' ? 'Past Due' : 'Free')}
            </Text>
          </View>
          {status !== 'active' ? (
            <SubscriptionScreen />
          ) : (
            <View style={styles.unsubscribeSection}>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://billing.stripe.com/p/login/test_8x228qdqcg3lgeQ1xA3sI00')}
              >
                <Text style={styles.unsubscribeText}>Unsubscribe</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Account Section */}
        <View style={[styles.section, { borderBottomColor: theme.trim }]}>
          <Text style={[styles.sectionTitle, { color: theme.trim }]}>Account</Text>
          <TouchableOpacity
            style={[styles.resetButton, { backgroundColor: '#444', marginBottom: 10 }]}
            onPress={logout}
          >
            <Text style={styles.buttonText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { borderBottomColor: theme.trim }]}>
          <Text style={[styles.sectionTitle, { color: '#FF3B30' }]}>Data Management</Text>
          <View style={[styles.settingItem, { borderBottomColor: theme.main }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.trim }]}>Reset Database</Text>
              <Text style={[styles.settingDescription, { color: theme.trim }]}>Permanently delete all data</Text>
            </View>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => setResetModalVisible(true)}
            >
              <Text style={styles.resetButtonText}>Reset Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reset Confirmation Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={resetModalVisible}
          onRequestClose={() => setResetModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.resetModalContainer, { backgroundColor: theme.main }]}>
              <Text style={styles.resetModalTitle}>Warning</Text>
              <Text style={styles.resetModalText}>
                This will permanently delete all your spending data and custom categories. This action cannot be undone.
              </Text>
              <View style={styles.resetModalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setResetModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmResetButton]}
                  onPress={handleResetDatabase}
                >
                  <Text style={styles.confirmResetButtonText}>Reset Anyway</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flex: 1,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
  },
  picker: {
    color: '#32CD32',
    backgroundColor: 'transparent',
  },
  disclaimerContainer: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
  },
  disclaimerText: {
    fontSize: 12,
    opacity: 0.8,
    fontStyle: 'italic',
  },
  resetButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resetModalContainer: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#FF3B30',
    alignItems: 'center',
  },
  resetModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 16,
  },
  resetModalText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  resetModalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#333333',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  confirmResetButton: {
    backgroundColor: '#FF3B30',
  },
  confirmResetButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  activeStatus: {
    color: '#32CD32',
  },
  inactiveStatus: {
    color: '#888',
  },
  warningStatus: {
    color: '#FFCC00',
  },
  unsubscribeSection: {
    marginTop: 10,
    alignItems: 'center',
  },
  unsubscribeText: {
    color: '#32CD32',
    fontSize: 12,
    opacity: 0.4,
    textDecorationLine: 'underline',
  },

  // ── Theme picker styles ──
  themeRow: {
    marginBottom: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  themeRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  themeColorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    marginRight: 14,
  },
  themeRowInfo: {
    flex: 1,
  },
  themeChevron: {
    fontSize: 12,
    marginLeft: 8,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 10,
    paddingHorizontal: 4,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchCheck: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  swatchSwapIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  swatchSwapIndicatorText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  resetThemeButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetThemeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SettingsTab;
