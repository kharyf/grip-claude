import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Switch, TouchableOpacity, Modal, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';

const SettingsTab = ({ chartType, onChartTypeChange }) => {
  // Toggle settings
  const [notifications, setNotifications] = useState(true);

  // Slider settings
  const [budgetAlert, setBudgetAlert] = useState(80);
  const [chartRefreshRate, setChartRefreshRate] = useState(30);
  const [fontSize, setFontSize] = useState(16);

  // Dropdown settings
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('English');
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
              minimumValue={0}
              maximumValue={100}
              value={budgetAlert}
              onValueChange={setBudgetAlert}
              minimumTrackTintColor="#32CD32"
              maximumTrackTintColor="#767577"
              thumbTintColor="#32CD32"
            />
          </View>

          {/* Slider 2: Chart Refresh Rate */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Chart Refresh Rate</Text>
              <Text style={styles.settingDescription}>{Math.round(chartRefreshRate)} seconds</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={10}
              maximumValue={120}
              value={chartRefreshRate}
              onValueChange={setChartRefreshRate}
              minimumTrackTintColor="#32CD32"
              maximumTrackTintColor="#767577"
              thumbTintColor="#32CD32"
            />
          </View>

          {/* Slider 3: Font Size */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Font Size</Text>
              <Text style={styles.settingDescription}>{Math.round(fontSize)}px</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={12}
              maximumValue={24}
              value={fontSize}
              onValueChange={setFontSize}
              minimumTrackTintColor="#32CD32"
              maximumTrackTintColor="#767577"
              thumbTintColor="#32CD32"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          {/* Dropdown 1: Currency */}
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Currency</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={currency}
                onValueChange={setCurrency}
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

          {/* Dropdown 2: Language */}
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Language</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={language}
                onValueChange={setLanguage}
                style={styles.picker}
                dropdownIconColor="#32CD32"
              >
                <Picker.Item label="English" value="English" color="#32CD32" />
                <Picker.Item label="Spanish" value="Spanish" color="#32CD32" />
                <Picker.Item label="French" value="French" color="#32CD32" />
                <Picker.Item label="German" value="German" color="#32CD32" />
                <Picker.Item label="Japanese" value="Japanese" color="#32CD32" />
              </Picker>
            </View>
          </View>

          {/* Dropdown 3: Chart Type */}
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Current Chart Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={chartType}
                onValueChange={onChartTypeChange}
                style={styles.picker}
                dropdownIconColor="#32CD32"
              >
                <Picker.Item label="Pie Chart" value="Pie" color="#32CD32" />
                <Picker.Item label="Bar Chart" value="Bar" color="#32CD32" />
                <Picker.Item label="Line Chart" value="Line" color="#32CD32" />
                <Picker.Item label="Donut Chart" value="Donut" color="#32CD32" />
              </Picker>
            </View>
          </View>
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
});

export default SettingsTab;
