import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Switch, TouchableOpacity, Modal, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { Slider } from '@miblanchard/react-native-slider';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import SubscriptionScreen from './SubscriptionScreen';

const SettingsTab = ({ currency, onCurrencyChange }) => {
  // Toggle settings
  const [notifications, setNotifications] = useState(true);

  // Slider settings
  const [budgetAlert, setBudgetAlert] = useState(80);
  const { logout } = useAuth();
  const { status, subscription } = useSubscription();

  // Options
  const [resetModalVisible, setResetModalVisible] = useState(false);

  const handleResetDatabase = async () => {
    try {
      await AsyncStorage.multiRemove(['categoryItems', 'customCategories']);
      setResetModalVisible(false);
      Alert.alert('Success', 'Database has been reset. Please restart the app or navigate back to Spending tab to see changes.');
    } catch (error) {
      console.error('Failed to reset database:', error);
      Alert.alert('Error', 'Failed to reset database.');
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.backgroundPattern} />
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General Settings</Text>

          {/* Toggle 1: Notifications */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>Receive alerts about spending</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#767577', true: '#32CD32' }}
              thumbColor={notifications ? '#1a1a1a' : '#f4f3f4'}
            />
          </View>



        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget & Alerts</Text>

          {/* Slider 1: Budget Alert */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Budget Alert Threshold</Text>
              <Text style={styles.settingDescription}>{budgetAlert}% of monthly budget</Text>
            </View>
            <Slider
              style={styles.slider}
              value={budgetAlert}
              onValueChange={value => setBudgetAlert(Array.isArray(value) ? value[0] : value)}
              minimumValue={0}
              maximumValue={100}
              minimumTrackTintColor="#32CD32"
              maximumTrackTintColor="#767577"
              thumbStyle={{ backgroundColor: '#32CD32' }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          {/* Dropdown 1: Currency */}
          <View style={styles.settingItem}>
            <View style={styles.disclaimerContainer}>
              <Text style={styles.disclaimerText}>
                Note: Currency change is visual only; no exchange rate calculations are performed.
              </Text>
            </View>
            <Text style={styles.settingLabel}>Currency</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={currency}
                onValueChange={onCurrencyChange}
                style={styles.picker}
                dropdownIconColor="#32CD32"
              >
                <Picker.Item label="US Dollar (USD)" value="USD" color="#32CD32" />
                <Picker.Item label="Euro (EUR)" value="EUR" color="#32CD32" />
                <Picker.Item label="British Pound (GBP)" value="GBP" color="#32CD32" />
                <Picker.Item label="Japanese Yen (JPY)" value="JPY" color="#32CD32" />
                <Picker.Item label="Canadian Dollar (CAD)" value="CAD" color="#32CD32" />
              </Picker>
            </View>
          </View>


        </View>
        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <Text style={styles.settingDescription}>Upgrade to Premium to remove all advertisements from the app.</Text>
          <View style={[styles.settingItem, { marginTop: 10 }]}>
            <Text style={styles.settingLabel}>Status</Text>
            <Text style={[
              styles.statusText,
              status === 'active' ? styles.activeStatus : (subscription?.status === 'past_due' ? styles.warningStatus : styles.inactiveStatus)
            ]}>
              {status === 'active' ? (subscription?.status === 'trialing' ? 'Premium (Trial)' : 'Premium') : (subscription?.status === 'past_due' ? 'Past Due' : 'Free')}
            </Text>
          </View>
          {status !== 'active' && <SubscriptionScreen />}
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={[styles.resetButton, { backgroundColor: '#444', marginBottom: 10 }]}
            onPress={logout}
          >
            <Text style={styles.buttonText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FF3B30' }]}>Data Management</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Reset Database</Text>
              <Text style={styles.settingDescription}>Permanently delete all data</Text>
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
            <View style={styles.resetModalContainer}>
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
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#32CD32',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#32CD32',
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a3a1a',
  },
  settingInfo: {
    flex: 1,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#32CD32',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#32CD32',
    opacity: 0.7,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#32CD32',
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#1a1a1a',
  },
  picker: {
    color: '#32CD32',
    backgroundColor: 'transparent',
  },
  disclaimerContainer: {
    backgroundColor: '#1a3a1a',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#32CD32',
  },
  disclaimerText: {
    color: '#32CD32',
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
    backgroundColor: '#1a1a1a',
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
});

export default SettingsTab;
