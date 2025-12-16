import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';

const SettingsTab = ({ chartType, onChartTypeChange }) => {
  // Toggle settings
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const [biometrics, setBiometrics] = useState(true);

  // Slider settings
  const [budgetAlert, setBudgetAlert] = useState(80);
  const [chartRefreshRate, setChartRefreshRate] = useState(30);
  const [fontSize, setFontSize] = useState(16);

  // Dropdown settings
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('English');

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

        {/* Toggle 2: Dark Mode */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Text style={styles.settingDescription}>Use dark theme</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#767577', true: '#32CD32' }}
            thumbColor={darkMode ? '#1a1a1a' : '#f4f3f4'}
          />
        </View>

        {/* Toggle 3: Auto Sync */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto Sync</Text>
            <Text style={styles.settingDescription}>Sync data automatically</Text>
          </View>
          <Switch
            value={autoSync}
            onValueChange={setAutoSync}
            trackColor={{ false: '#767577', true: '#32CD32' }}
            thumbColor={autoSync ? '#1a1a1a' : '#f4f3f4'}
          />
        </View>

        {/* Toggle 4: Biometrics */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Biometric Authentication</Text>
            <Text style={styles.settingDescription}>Use fingerprint or face ID</Text>
          </View>
          <Switch
            value={biometrics}
            onValueChange={setBiometrics}
            trackColor={{ false: '#767577', true: '#32CD32' }}
            thumbColor={biometrics ? '#1a1a1a' : '#f4f3f4'}
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
});

export default SettingsTab;
