import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import SpendingTab from './components/SpendingTab';
import ChatTab from './components/ChatTab';
import SettingsTab from './components/SettingsTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('Spending');
  const [menuVisible, setMenuVisible] = useState(false);
  const [chartType, setChartType] = useState('Pie');

  const renderContent = () => {
    switch (activeTab) {
      case 'Spending':
        return <SpendingTab chartType={chartType} />;
      case 'Assistant':
        return <ChatTab />;
      case 'Settings':
        return <SettingsTab chartType={chartType} onChartTypeChange={setChartType} />;
      default:
        return <SpendingTab chartType={chartType} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* App Title */}
      <View style={styles.titleContainer}>
        <TouchableOpacity 
          style={styles.userIconButton}
          onPress={() => setMenuVisible(true)}
        >
          <View style={styles.userIcon}>
            <Text style={styles.userIconText}>👤</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.appTitle}>Gripah</Text>
        <View style={styles.userIconPlaceholder} />
      </View>
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Spending' && styles.activeTab]}
          onPress={() => setActiveTab('Spending')}
        >
          <Text style={[styles.tabText, activeTab === 'Spending' && styles.activeTabText]}>
            Spending
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Assistant' && styles.activeTab]}
          onPress={() => setActiveTab('Assistant')}
        >
          <Text style={[styles.tabText, activeTab === 'Assistant' && styles.activeTabText]}>
            Assistant
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Settings' && styles.activeTab]}
          onPress={() => setActiveTab('Settings')}
        >
          <Text style={[styles.tabText, activeTab === 'Settings' && styles.activeTabText]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* User Menu Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                // Handle view profile action
              }}
            >
              <Text style={styles.menuIcon}>👤</Text>
              <Text style={styles.menuText}>View Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                // Handle account settings action
              }}
            >
              <Text style={styles.menuIcon}>⚙️</Text>
              <Text style={styles.menuText}>Account Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => {
                setMenuVisible(false);
                // Handle logout action
              }}
            >
              <Text style={styles.menuIcon}>🚪</Text>
              <Text style={styles.menuText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2a2a2a',
  },
  titleContainer: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 5,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#32CD32',
  },
  userIconButton: {
    padding: 4,
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#32CD32',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  userIconText: {
    fontSize: 24,
  },
  userIconPlaceholder: {
    width: 40,
    height: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#32CD32',
    letterSpacing: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#32CD32',
    backgroundColor: '#1a1a1a',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    borderRightWidth: 1,
    borderRightColor: '#32CD32',
    borderLeftWidth: 1,
    borderLeftColor: '#32CD32',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginTop: 4,
  },
  activeTab: {
    borderBottomColor: '#32CD32',
    backgroundColor: '#2a2a2a',
    borderTopWidth: 2,
    borderTopColor: '#32CD32',
  },
  tabText: {
    color: '#32CD32',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  menuContainer: {
    backgroundColor: '#1a1a1a',
    marginTop: 80,
    marginLeft: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#32CD32',
    minWidth: 220,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#32CD32',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#32CD32',
    fontWeight: '600',
  },
});
