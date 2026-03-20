import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserItem, setUserItem } from '../utils/userStorage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { BASE_CATEGORIES } from '../utils/defaults';
import { Picker } from '@react-native-picker/picker';

const AutopayTab = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const userId = user?.userId;

  const [autopays, setAutopays] = useState([]);
  const [annualAutopays, setAnnualAutopays] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [isAnnualMode, setIsAnnualMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState('January');
  const [day, setDay] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [isCategoryPickerVisible, setIsCategoryPickerVisible] = useState(false);
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      try {
        const savedAutopays = await getUserItem(userId, 'autopays');
        if (savedAutopays) {
          setAutopays(JSON.parse(savedAutopays));
        }

        const savedAnnualAutopays = await getUserItem(userId, 'annualAutopays');
        if (savedAnnualAutopays) {
          setAnnualAutopays(JSON.parse(savedAnnualAutopays));
        }

        const savedCustom = await getUserItem(userId, 'customCategories');
        if (savedCustom) {
          setCustomCategories(JSON.parse(savedCustom));
        }
      } catch (e) {
        console.error('Failed to load autopay data:', e);
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadData();
  }, [userId]);

  // Save data
  useEffect(() => {
    if (!isDataLoaded || !userId) return;
    const saveData = async () => {
      try {
        await setUserItem(userId, 'autopays', JSON.stringify(autopays));
        await setUserItem(userId, 'annualAutopays', JSON.stringify(annualAutopays));
      } catch (e) {
        console.error('Failed to save autopay data:', e);
      }
    };
    saveData();
  }, [autopays, annualAutopays, isDataLoaded, userId]);

  const allCategoryNames = [
    ...BASE_CATEGORIES.map(c => c.name),
    ...customCategories.map(c => c.name)
  ];

  const openAddModal = (isAnnual = false) => {
    setIsAnnualMode(isAnnual);
    setEditingId(null);
    setName('');
    setAmount('');
    setMonth(MONTHS[new Date().getMonth()]);
    setDay('');
    setCategory(allCategoryNames[0] || 'Groceries');
    setModalVisible(true);
  };

  const openEditModal = (autopay, isAnnual = false) => {
    setIsAnnualMode(isAnnual);
    setEditingId(autopay.id);
    setName(autopay.name);
    setAmount(autopay.amount.toString());
    if (isAnnual && autopay.month) {
      setMonth(autopay.month);
    }
    setDay(autopay.day.toString());
    setCategory(autopay.category);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setIsCategoryPickerVisible(false);
    setIsMonthPickerVisible(false);
  };

  const handleSave = () => {
    if (!name.trim() || !amount.trim() || !day.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
      return;
    }

    const dayNum = parseInt(day);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      Alert.alert('Invalid Day', 'Please enter a day between 1 and 31.');
      return;
    }

    if (editingId) {
      if (isAnnualMode) {
        setAnnualAutopays(prev => prev.map(a => 
          a.id === editingId ? { ...a, name, amount: amt, month, day: dayNum, category } : a
        ));
      } else {
        setAutopays(prev => prev.map(a => 
          a.id === editingId ? { ...a, name, amount: amt, day: dayNum, category } : a
        ));
      }
    } else {
      const newAutopay = {
        id: Date.now().toString(),
        name,
        amount: amt,
        day: dayNum,
        category,
        ...(isAnnualMode && { month })
      };
      
      if (isAnnualMode) {
        setAnnualAutopays(prev => [...prev, newAutopay]);
      } else {
        setAutopays(prev => [...prev, newAutopay]);
      }
    }
    closeModal();
  };

  const handleDelete = (id, isAnnual = false) => {
    Alert.alert(
      'Delete Autopay',
      'Are you sure you want to remove this autopay?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          if (isAnnual) {
            setAnnualAutopays(prev => prev.filter(a => a.id !== id));
          } else {
            setAutopays(prev => prev.filter(a => a.id !== id));
          }
        }}
      ]
    );
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.main }]}>
      <View style={[styles.backgroundPattern, { backgroundColor: theme.main }]} />
      <ScrollView style={[styles.container, { backgroundColor: `${theme.secondary}D9` }]}>
        <View style={[styles.header, { borderBottomColor: theme.trim }]}>
          <Text style={[styles.title, { color: theme.trim }]}>Monthly</Text>
          <Text style={[styles.subtitle, { color: theme.trim }]}>
            Recurring payments will be automatically added to your spending.
          </Text>
        </View>

        <View style={styles.listContainer}>
          {autopays.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.trim }]}>No monthly autopays scheduled yet.</Text>
            </View>
          ) : (
            autopays.map((autopay) => (
              <View key={autopay.id} style={[styles.autopayItem, { backgroundColor: theme.main, borderColor: theme.trim }]}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: theme.trim }]}>{autopay.name}</Text>
                  <Text style={[styles.itemDetail, { color: theme.trim }]}>
                    {autopay.category} • Day {autopay.day}
                  </Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={[styles.itemAmount, { color: theme.trim }]}>${autopay.amount.toFixed(2)}</Text>
                  <View style={styles.itemActions}>
                    <TouchableOpacity 
                      onPress={() => openEditModal(autopay, false)} 
                      style={[styles.actionButton, { borderColor: theme.trim }]}
                    >
                      <Text style={[styles.actionIcon, { color: theme.trim }]}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDelete(autopay.id, false)} 
                      style={[styles.actionButton, { borderColor: '#FF3B30' }]}
                    >
                      <Text style={[styles.actionIcon, { color: '#FF3B30' }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: theme.trim, borderColor: theme.main }]}
          onPress={() => openAddModal(false)}
        >
          <Text style={[styles.addButtonText, { color: theme.main }]}>+ Add Monthly Autopay</Text>
        </TouchableOpacity>

        {/* Annual Section */}
        <View style={[styles.header, { borderBottomColor: theme.trim, marginTop: 20 }]}>
          <Text style={[styles.title, { color: theme.trim }]}>Annual</Text>
        </View>

        <View style={styles.listContainer}>
          {annualAutopays.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.trim }]}>No annual autopays scheduled yet.</Text>
            </View>
          ) : (
            annualAutopays.map((autopay) => (
              <View key={autopay.id} style={[styles.autopayItem, { backgroundColor: theme.main, borderColor: theme.trim }]}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: theme.trim }]}>{autopay.name}</Text>
                  <Text style={[styles.itemDetail, { color: theme.trim }]}>
                    {autopay.category} • {autopay.month} {autopay.day}
                  </Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={[styles.itemAmount, { color: theme.trim }]}>${autopay.amount.toFixed(2)}</Text>
                  <View style={styles.itemActions}>
                    <TouchableOpacity 
                      onPress={() => openEditModal(autopay, true)} 
                      style={[styles.actionButton, { borderColor: theme.trim }]}
                    >
                      <Text style={[styles.actionIcon, { color: theme.trim }]}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDelete(autopay.id, true)} 
                      style={[styles.actionButton, { borderColor: '#FF3B30' }]}
                    >
                      <Text style={[styles.actionIcon, { color: '#FF3B30' }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: theme.trim, borderColor: theme.main, marginBottom: 40 }]}
          onPress={() => openAddModal(true)}
        >
          <Text style={[styles.addButtonText, { color: theme.main }]}>+ Add Annual Autopay</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.main, borderColor: theme.trim }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.trim }]}>
              <Text style={[styles.modalTitle, { color: theme.trim }]}>
                {editingId ? 'Edit Autopay' : 'New Autopay'}
              </Text>
              <TouchableOpacity onPress={closeModal} style={[styles.closeButton, { backgroundColor: theme.trim }]}>
                <Text style={[styles.closeButtonText, { color: theme.main }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.inputLabel, { color: theme.trim }]}>Category *</Text>
              <TouchableOpacity 
                style={[styles.input, styles.pickerButton, { backgroundColor: theme.secondary, borderColor: theme.trim }]}
                onPress={() => setIsCategoryPickerVisible(true)}
              >
                <Text style={{ color: theme.trim }}>{category}</Text>
                <Text style={{ color: theme.trim }}>▼</Text>
              </TouchableOpacity>

              <Text style={[styles.inputLabel, { color: theme.trim }]}>Name *</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.secondary, borderColor: theme.trim, color: theme.trim }]}
                value={name}
                onChangeText={setName}
                placeholder={isAnnualMode ? "e.g., Annual Domain" : "e.g., Monthly Rent"}
                placeholderTextColor="#666"
              />

              <Text style={[styles.inputLabel, { color: theme.trim }]}>Amount *</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.secondary, borderColor: theme.trim, color: theme.trim }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g., 1200.00"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
              />

              {isAnnualMode && (
                <>
                  <Text style={[styles.inputLabel, { color: theme.trim }]}>Month *</Text>
                  <TouchableOpacity 
                    style={[styles.input, styles.pickerButton, { backgroundColor: theme.secondary, borderColor: theme.trim }]}
                    onPress={() => setIsMonthPickerVisible(true)}
                  >
                    <Text style={{ color: theme.trim }}>{month}</Text>
                    <Text style={{ color: theme.trim }}>▼</Text>
                  </TouchableOpacity>
                </>
              )}

              <Text style={[styles.inputLabel, { color: theme.trim }]}>{isAnnualMode ? 'Day *' : 'Day of Month (1-31) *'}</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.secondary, borderColor: theme.trim, color: theme.trim }]}
                value={day}
                onChangeText={setDay}
                placeholder="e.g., 1"
                placeholderTextColor="#666"
                keyboardType="number-pad"
              />

              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: theme.trim }]}
                onPress={handleSave}
              >
                <Text style={[styles.saveButtonText, { color: theme.main }]}>
                  {editingId ? 'Update Autopay' : 'Save Autopay'}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Month Picker Overlay */}
            {isMonthPickerVisible && (
              <View style={[styles.pickerOverlay, { backgroundColor: theme.main }]}>
                <View style={[styles.pickerHeader, { borderBottomColor: theme.trim }]}>
                  <Text style={[styles.pickerTitle, { color: theme.trim }]}>Select Month</Text>
                  <TouchableOpacity onPress={() => setIsMonthPickerVisible(false)}>
                    <Text style={[styles.pickerClose, { color: theme.trim }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView>
                  {MONTHS.map((m, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.pickerItem, month === m && { backgroundColor: `${theme.trim}22` }]}
                      onPress={() => {
                        setMonth(m);
                        setIsMonthPickerVisible(false);
                      }}
                    >
                      <Text style={[styles.pickerItemText, { color: theme.trim }]}>{m}</Text>
                      {month === m && <Text style={{ color: theme.trim }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Category Picker Overlay */}
            {isCategoryPickerVisible && (
              <View style={[styles.pickerOverlay, { backgroundColor: theme.main }]}>
                <View style={[styles.pickerHeader, { borderBottomColor: theme.trim }]}>
                  <Text style={[styles.pickerTitle, { color: theme.trim }]}>Select Category</Text>
                  <TouchableOpacity onPress={() => setIsCategoryPickerVisible(false)}>
                    <Text style={[styles.pickerClose, { color: theme.trim }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView>
                  {allCategoryNames.map((cat, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.pickerItem, category === cat && { backgroundColor: `${theme.trim}22` }]}
                      onPress={() => {
                        setCategory(cat);
                        setIsCategoryPickerVisible(false);
                      }}
                    >
                      <Text style={[styles.pickerItemText, { color: theme.trim }]}>{cat}</Text>
                      {category === cat && <Text style={{ color: theme.trim }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
  autopayItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 14,
    opacity: 0.7,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  itemActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  actionIcon: {
    fontSize: 12,
  },
  addButton: {
    margin: 20,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
      android: { elevation: 4 },
    }),
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalForm: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveButton: {
    marginTop: 24,
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth:1,
    marginBottom: 8,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerClose: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 16,
  },
});

export default AutopayTab;
