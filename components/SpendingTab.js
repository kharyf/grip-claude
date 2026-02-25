import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';
import { Picker } from '@react-native-picker/picker';
import { getDefaultCategoryItems, BASE_CATEGORIES } from '../utils/defaults';

const SpendingTab = ({ chartType = 'Pie', currencySymbol = '$' }) => {
  // Initialize with base items for all categories
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDate, setNewItemDate] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryItems, setCategoryItems] = useState(getDefaultCategoryItems());
  const [customCategories, setCustomCategories] = useState([]);
  const [editItemModalVisible, setEditItemModalVisible] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemDate, setEditItemDate] = useState('');
  const [editItemAmount, setEditItemAmount] = useState('');
  const [timeRange, setTimeRange] = useState('All Time');
  const [timeRangeModalVisible, setTimeRangeModalVisible] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load data from AsyncStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedCategoryItems = await AsyncStorage.getItem('categoryItems');
        const savedCustomCategories = await AsyncStorage.getItem('customCategories');

        if (savedCategoryItems !== null) {
          let items = JSON.parse(savedCategoryItems);
          setCategoryItems(items);
        }
        if (savedCustomCategories !== null) {
          let custom = JSON.parse(savedCustomCategories);
          setCustomCategories(custom);
        }
      } catch (error) {
        console.error('Failed to load spending data:', error);
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadData();
  }, []);

  // Save data to AsyncStorage whenever it changes
  useEffect(() => {
    if (!isDataLoaded) return;

    const saveData = async () => {
      try {
        await AsyncStorage.setItem('categoryItems', JSON.stringify(categoryItems));
        await AsyncStorage.setItem('customCategories', JSON.stringify(customCategories));
      } catch (error) {
        console.error('Failed to save spending data:', error);
      }
    };
    saveData();
  }, [categoryItems, customCategories, isDataLoaded]);

  const baseSpendingData = BASE_CATEGORIES.map(cat => ({
    name: cat.name,
    baseAmount: 100,
    color: cat.color,
    legendFontColor: '#32CD32',
    legendFontSize: 14,
  }));

  const chartConfig = {
    backgroundColor: '#2a2a2a',
    backgroundGradientFrom: '#2a2a2a',
    backgroundGradientTo: '#2a2a2a',
    color: (opacity = 1) => `rgba(50, 205, 50, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(50, 205, 50, ${opacity})`,
  };

  // Helper to check if a date falls within the selected time range
  const isWithinTimeRange = (dateString, range) => {
    if (!range || range === 'All Time') return true;
    if (!dateString || dateString === '-') return true; // Treat undated items as "Today"

    // Helper to parse "MMM D, YYYY" format reliably
    const parseCustomDate = (str) => {
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d;

      // Fallback for tricky environments: manual parse "Feb 24, 2026"
      const match = str.match(/([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
      if (match) {
        const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
        const month = months[match[1].substring(0, 3)];
        const day = parseInt(match[2]);
        const year = parseInt(match[3]);
        if (month !== undefined) return new Date(year, month, day);
      }
      return null;
    };

    const itemDate = parseCustomDate(dateString);
    if (!itemDate) return true; // Fallback to showing if we can't parse

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(startOfToday);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (range === 'Today') {
      return itemDate >= startOfToday && itemDate < tomorrow;
    }

    if (range === 'This Week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff);
      startOfWeek.setHours(0, 0, 0, 0);
      return itemDate >= startOfWeek && itemDate < tomorrow;
    }

    if (range === 'This Month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return itemDate >= startOfMonth && itemDate < tomorrow;
    }

    if (range === 'This Year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return itemDate >= startOfYear && itemDate < tomorrow;
    }

    return true;
  };

  // Calculate dynamic totals for each category
  const calculateCategoryTotal = (categoryName) => {
    const items = categoryItems[categoryName] || [];
    return items
      .filter(item => isWithinTimeRange(item.date, timeRange))
      .reduce((sum, item) => sum + item.amount, 0);
  };

  // Get all active categories (those with items OR are custom categories)
  const activeCategoryNames = Object.keys(categoryItems).filter(
    categoryName => categoryItems[categoryName] && categoryItems[categoryName].length > 0
  );

  // Build spending data from active categories
  const allSpendingData = [
    ...baseSpendingData
      .map(item => ({
        ...item,
        amount: calculateCategoryTotal(item.name),
      })),
    // Include all custom categories
    ...customCategories
      .map(category => ({
        name: category.name,
        amount: calculateCategoryTotal(category.name),
        color: category.color,
        legendFontColor: '#32CD32',
        legendFontSize: 14,
      })),
  ];

  // Sort spending data in descending order and filter out $0 categories unless in "All Time"
  const sortedSpendingData = allSpendingData
    .filter(item => timeRange === 'All Time' || item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const totalSpending = sortedSpendingData.reduce((sum, item) => sum + item.amount, 0);

  // Add percentage to each item for display and truncate names for chart
  const dataWithPercentage = sortedSpendingData
    .filter(item => item.amount > 0) // Only show items with data in the chart
    .map(item => {
      // Truncate long names for the pie chart legend
      let displayName = item.name;
      if (displayName.length > 12) {
        displayName = displayName.substring(0, 12) + '...';
      }

      return {
        ...item,
        name: displayName,
        population: item.amount,
        legendFontSize: 13,
      };
    });

  // Get itemized data for a category
  const getItemizedData = (category) => {
    const items = categoryItems[category] || [];
    // Filter and sort items
    return items
      .filter(item => isWithinTimeRange(item.date, timeRange))
      .sort((a, b) => b.amount - a.amount);
  };

  const handleCategoryPress = (category) => {
    setSelectedCategory(category);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedCategory(null);
  };

  const openAddItemModal = (category) => {
    setSelectedCategory(category);
    setAddItemModalVisible(true);
  };

  const closeAddItemModal = () => {
    setAddItemModalVisible(false);
    setNewItemName('');
    setNewItemDate('');
    setNewItemAmount('');
  };

  const openAddCategoryModal = () => {
    setAddCategoryModalVisible(true);
  };

  const closeAddCategoryModal = () => {
    setAddCategoryModalVisible(false);
    setNewCategoryName('');
  };

  // Helper function to parse and format dates
  const parseAndFormatDate = (dateInput) => {
    if (!dateInput || !dateInput.trim()) {
      // If no date provided, return hyphen
      return '-';
    }

    const input = dateInput.trim();
    let parsedDate = null;

    // Try various date formats
    // Format: "Dec 25", "Dec 25,", "December 25"
    const monthDayMatch = input.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})?$/);
    if (monthDayMatch) {
      const monthStr = monthDayMatch[1];
      const day = parseInt(monthDayMatch[2]);
      const year = monthDayMatch[3] ? parseInt(monthDayMatch[3]) : new Date().getFullYear();

      // Try to parse the month
      const monthMap = {
        'jan': 0, 'january': 0,
        'feb': 1, 'february': 1,
        'mar': 2, 'march': 2,
        'apr': 3, 'april': 3,
        'may': 4,
        'jun': 5, 'june': 5,
        'jul': 6, 'july': 6,
        'aug': 7, 'august': 7,
        'sep': 8, 'sept': 8, 'september': 8,
        'oct': 9, 'october': 9,
        'nov': 10, 'november': 10,
        'dec': 11, 'december': 11
      };

      const month = monthMap[monthStr.toLowerCase()];
      if (month !== undefined && day >= 1 && day <= 31) {
        parsedDate = new Date(year, month, day);
      }
    }

    // Format: "12/25", "12/25/2024", "12-25", "12-25-2024"
    const numericMatch = input.match(/^(\d{1,2})[\/\-](\d{1,2})([\/\-](\d{2,4}))?$/);
    if (!parsedDate && numericMatch) {
      const month = parseInt(numericMatch[1]) - 1; // months are 0-indexed
      const day = parseInt(numericMatch[2]);
      let year = new Date().getFullYear();

      if (numericMatch[4]) {
        year = parseInt(numericMatch[4]);
        if (year < 100) {
          year += 2000; // Convert 2-digit year to 4-digit
        }
      }

      if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        parsedDate = new Date(year, month, day);
      }
    }

    // Format: "2024-12-25" (ISO format)
    const isoMatch = input.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (!parsedDate && isoMatch) {
      const year = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]) - 1;
      const day = parseInt(isoMatch[3]);

      if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        parsedDate = new Date(year, month, day);
      }
    }

    // Try native Date parsing as last resort
    if (!parsedDate) {
      parsedDate = new Date(input);
    }

    // Validate the parsed date
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // If all parsing fails, return null to indicate invalid date
    return null;
  };

  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemAmount.trim()) {
      return;
    }

    const amount = parseFloat(newItemAmount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    // Validate and format date
    const formattedDate = parseAndFormatDate(newItemDate);
    if (newItemDate.trim() && !formattedDate) {
      // Show error for invalid date
      alert('Invalid date format. Please use formats like "Dec 25", "12/25/2024", or "2024-12-25"');
      return;
    }

    const newItem = {
      id: Date.now(),
      name: newItemName,
      date: formattedDate,
      amount: amount,
      isBase: false,
    };

    setCategoryItems(prev => ({
      ...prev,
      [selectedCategory]: [...(prev[selectedCategory] || []), newItem],
    }));

    closeAddItemModal();
  };

  const handleAddCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      return;
    }

    // Check for duplicates (case-insensitive)
    const categoryExists = Object.keys(categoryItems).some(
      key => key.toLowerCase() === trimmedName.toLowerCase()
    );

    if (categoryExists) {
      Alert.alert(
        "Duplicate Category",
        `A category named "${trimmedName}" already exists. Please choose a unique name.`
      );
      return;
    }

    // Generate a random vibrant color for the new category
    const colors = [
      '#FF6347', '#4169E1', '#32CD32', '#FF69B4', '#FF8C00',
      '#9370DB', '#00CED1', '#FFD700', '#DC143C', '#7FFF00',
      '#FF1493', '#00BFFF', '#ADFF2F', '#FF4500', '#DA70D6',
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newCategory = {
      name: newCategoryName,
      color: randomColor,
    };

    // Initialize with empty items array
    setCategoryItems(prev => ({
      ...prev,
      [newCategoryName]: [],
    }));

    setCustomCategories(prev => [...prev, newCategory]);
    closeAddCategoryModal();
  };

  const handleDeleteCategory = (categoryName) => {
    Alert.alert(
      "Delete Category",
      `Are you sure you want to delete the "${categoryName}" category? This will permanently delete all spending records associated with it.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // 1. Remove from categoryItems
            setCategoryItems(prev => {
              const updated = { ...prev };
              delete updated[categoryName];
              return updated;
            });

            // 2. Remove from customCategories
            setCustomCategories(prev => prev.filter(c => c.name !== categoryName));

            // 3. Clear selection and close modal
            closeModal();
          }
        }
      ]
    );
  };

  const handleRemoveItem = (category, itemId) => {
    // Simply remove the item from the category
    setCategoryItems(prev => ({
      ...prev,
      [category]: (prev[category] || []).filter(item => item.id !== itemId),
    }));

    // If this was the last item, close the modal
    const currentItems = getItemizedData(category);
    if (currentItems.length === 1) {
      setModalVisible(false);
    }
  };

  const openEditItemModal = (category, item) => {
    console.log('Opening edit modal for:', category, item);

    // Close the itemized breakdown modal first
    setModalVisible(false);

    // Set edit values
    setItemToEdit({ category, item });
    setEditItemName(item.name);
    setEditItemDate(item.date);
    setEditItemAmount(item.amount.toString());

    // Small delay to ensure first modal is closed before opening edit modal
    setTimeout(() => {
      setEditItemModalVisible(true);
      console.log('Edit modal should be visible now');
    }, 100);
  };

  const closeEditItemModal = () => {
    setEditItemModalVisible(false);
    setItemToEdit(null);
    setEditItemName('');
    setEditItemDate('');
    setEditItemAmount('');

    // Reopen the itemized breakdown modal after a small delay
    setTimeout(() => {
      setModalVisible(true);
    }, 100);
  };

  const handleEditItem = () => {
    console.log('handleEditItem called');
    console.log('Edit values:', { editItemName, editItemDate, editItemAmount });

    if (!editItemName.trim() || !editItemAmount.trim()) {
      console.log('Validation failed - missing name or amount');
      return;
    }

    const amount = parseFloat(editItemAmount);
    if (isNaN(amount) || amount <= 0) {
      console.log('Validation failed - invalid amount');
      return;
    }

    // Validate and format date
    const formattedDate = parseAndFormatDate(editItemDate);
    if (editItemDate.trim() && !formattedDate) {
      // Show error for invalid date
      alert('Invalid date format. Please use formats like "Dec 25", "12/25/2024", or "2024-12-25"');
      return;
    }

    if (itemToEdit) {
      const { category, item } = itemToEdit;
      console.log('Updating item:', item.id, 'in category:', category);

      // Update the item in the category
      setCategoryItems(prev => ({
        ...prev,
        [category]: (prev[category] || []).map(i =>
          i.id === item.id
            ? { ...i, name: editItemName, date: formattedDate, amount: amount }
            : i
        ),
      }));

      console.log('Item updated, closing modal');

      // Close edit modal
      setEditItemModalVisible(false);
      setItemToEdit(null);
      setEditItemName('');
      setEditItemDate('');
      setEditItemAmount('');

      // Reopen the itemized breakdown modal to show updated values
      setTimeout(() => {
        setModalVisible(true);
      }, 100);
    } else {
      console.log('No itemToEdit found!');
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.backgroundPattern} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Money Spent:</Text>
            <Text style={styles.totalAmountText}>{currencySymbol}{totalSpending.toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            style={styles.filterContainer}
            onPress={() => setTimeRangeModalVisible(true)}
          >
            <Text style={styles.timeRangeText}>{timeRange}</Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          <Modal
            animationType="fade"
            transparent={true}
            visible={timeRangeModalVisible}
            onRequestClose={() => setTimeRangeModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.timeRangeModalOverlay}
              activeOpacity={1}
              onPress={() => setTimeRangeModalVisible(false)}
            >
              <View style={styles.timeRangeMenu}>
                {['Today', 'This Week', 'This Month', 'This Year', 'All Time'].map((range) => (
                  <TouchableOpacity
                    key={range}
                    style={[
                      styles.timeRangeOption,
                      timeRange === range && styles.timeRangeOptionSelected
                    ]}
                    onPress={() => {
                      setTimeRange(range);
                      setTimeRangeModalVisible(false);
                    }}
                  >
                    <Text style={[
                      styles.timeRangeOptionText,
                      timeRange === range && styles.timeRangeOptionTextSelected
                    ]}>
                      {range}
                    </Text>
                    {timeRange === range && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
        </View>

        <View style={styles.chartContainer}>
          {chartType === 'Pie' && (
            <PieChart
              data={dataWithPercentage}
              width={Dimensions.get('window').width - 40}
              height={240}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              center={[10, 0]}
            />
          )}
          {chartType === 'Bar' && (
            <BarChart
              data={{
                labels: sortedSpendingData
                  .filter(item => item.amount > 0)
                  .slice(0, 8)
                  .map(item => {
                    const name = item.name.length > 8 ? item.name.substring(0, 8) + '...' : item.name;
                    return name;
                  }),
                datasets: [{
                  data: sortedSpendingData
                    .filter(item => item.amount > 0)
                    .slice(0, 8)
                    .map(item => item.amount)
                }]
              }}
              width={Dimensions.get('window').width - 40}
              height={240}
              chartConfig={{
                ...chartConfig,
                barPercentage: 0.7,
                decimalPlaces: 0,
              }}
              style={{
                borderRadius: 16,
              }}
              fromZero
              showValuesOnTopOfBars
            />
          )}
          {chartType === 'Line' && (
            <LineChart
              data={{
                labels: sortedSpendingData
                  .filter(item => item.amount > 0)
                  .slice(0, 8)
                  .map(item => {
                    const name = item.name.length > 8 ? item.name.substring(0, 8) + '...' : item.name;
                    return name;
                  }),
                datasets: [{
                  data: sortedSpendingData
                    .filter(item => item.amount > 0)
                    .slice(0, 8)
                    .map(item => item.amount)
                }]
              }}
              width={Dimensions.get('window').width - 40}
              height={240}
              chartConfig={{
                ...chartConfig,
                decimalPlaces: 0,
              }}
              style={{
                borderRadius: 16,
              }}
              bezier
            />
          )}
          {chartType === 'Donut' && (
            <PieChart
              data={dataWithPercentage}
              width={Dimensions.get('window').width - 40}
              height={240}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              center={[10, 0]}
              hasLegend={true}
              absolute={false}
            />
          )}
        </View>

        <View style={styles.legendContainer}>
          {sortedSpendingData.map((item, index) => (
            <View key={index} style={styles.legendItemContainer}>
              <TouchableOpacity
                style={styles.legendItem}
                onPress={() => handleCategoryPress(item.name)}
                activeOpacity={0.7}
              >
                <View style={[styles.colorBox, { backgroundColor: item.color }]} />
                <Text style={styles.legendText} numberOfLines={1} ellipsizeMode="tail">
                  {item.name}
                </Text>
                <Text style={styles.amountText}>{currencySymbol}{Math.round(item.amount)}</Text>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => openAddItemModal(item.name)}
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Add Category Button */}
        <View style={styles.addCategoryButtonContainer}>
          <TouchableOpacity
            style={styles.addCategoryButton}
            onPress={openAddCategoryModal}
          >
            <Text style={styles.addCategoryButtonText}>+ Add Category</Text>
          </TouchableOpacity>
        </View>

        {/* Modal for itemized breakdown */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedCategory} - Itemized Breakdown
                </Text>
                <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {selectedCategory && getItemizedData(selectedCategory).map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDate}>{item.date}</Text>
                    </View>
                    <Text style={styles.itemAmount}>{currencySymbol}{item.amount}</Text>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => openEditItemModal(selectedCategory, item)}
                    >
                      <Text style={styles.editButtonText}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveItem(selectedCategory, item.id)}
                    >
                      <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalAmount}>
                    {currencySymbol}{selectedCategory && Math.round(sortedSpendingData.find(d => d.name === selectedCategory)?.amount || 0)}
                  </Text>
                </View>

                {/* Delete Category Button */}
                <TouchableOpacity
                  style={styles.deleteCategoryModalButton}
                  onPress={() => handleDeleteCategory(selectedCategory)}
                >
                  <Text style={styles.deleteCategoryModalButtonText}>🗑️ Delete Entire Category</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Add Item Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={addItemModalVisible}
          onRequestClose={closeAddItemModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.addItemModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Item to {selectedCategory}</Text>
                <TouchableOpacity onPress={closeAddItemModal} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.addItemForm}>
                <Text style={styles.inputLabel}>Item Name *</Text>
                <TextInput
                  style={styles.input}
                  value={newItemName}
                  onChangeText={setNewItemName}
                  placeholder="e.g., Whole Foods"
                  placeholderTextColor="#666"
                />

                <Text style={styles.inputLabel}>Date (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={newItemDate}
                  onChangeText={setNewItemDate}
                  placeholder="e.g., Dec 25, 2024 or 12/25/2024"
                  placeholderTextColor="#666"
                />

                <Text style={styles.inputLabel}>Amount *</Text>
                <TextInput
                  style={styles.input}
                  value={newItemAmount}
                  onChangeText={setNewItemAmount}
                  placeholder="e.g., 45.50"
                  placeholderTextColor="#666"
                  keyboardType="decimal-pad"
                />

                <TouchableOpacity style={styles.submitButton} onPress={handleAddItem}>
                  <Text style={styles.submitButtonText}>Add Item</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Category Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={addCategoryModalVisible}
          onRequestClose={closeAddCategoryModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.addItemModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Category</Text>
                <TouchableOpacity onPress={closeAddCategoryModal} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.addItemForm}>
                <Text style={styles.inputLabel}>Category Name *</Text>
                <TextInput
                  style={styles.input}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="e.g., Travel, Hobbies, Gifts"
                  placeholderTextColor="#666"
                />

                <TouchableOpacity style={styles.submitButton} onPress={handleAddCategory}>
                  <Text style={styles.submitButtonText}>Add Category</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Item Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={editItemModalVisible}
          onRequestClose={closeEditItemModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.addItemModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Item</Text>
                <TouchableOpacity onPress={closeEditItemModal} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.addItemForm}>
                <Text style={styles.inputLabel}>Item Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editItemName}
                  onChangeText={setEditItemName}
                  placeholder="e.g., Whole Foods"
                  placeholderTextColor="#666"
                />

                <Text style={styles.inputLabel}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={editItemDate}
                  onChangeText={setEditItemDate}
                  placeholder="e.g., Dec 25, 2024 or 12/25/2024"
                  placeholderTextColor="#666"
                />

                <Text style={styles.inputLabel}>Amount *</Text>
                <TextInput
                  style={styles.input}
                  value={editItemAmount}
                  onChangeText={setEditItemAmount}
                  placeholder="e.g., 45.50"
                  placeholderTextColor="#666"
                  keyboardType="decimal-pad"
                />

                <TouchableOpacity style={styles.submitButton} onPress={handleEditItem}>
                  <Text style={styles.submitButtonText}>Save Changes</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#32CD32',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 140,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#32CD32',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timeRangeText: {
    color: '#32CD32',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownArrow: {
    color: '#32CD32',
    fontSize: 10,
    marginLeft: 8,
  },
  timeRangeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRangeMenu: {
    backgroundColor: '#1a1a1a',
    width: '80%',
    borderRadius: 16,
    padding: 8,
    borderWidth: 2,
    borderColor: '#32CD32',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  timeRangeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
  },
  timeRangeOptionSelected: {
    backgroundColor: 'rgba(50, 205, 50, 0.15)',
  },
  timeRangeOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  timeRangeOptionTextSelected: {
    color: '#32CD32',
    fontWeight: '700',
  },
  checkIcon: {
    color: '#32CD32',
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalContainer: {
    alignItems: 'flex-start',
  },
  totalLabel: {
    fontSize: 12,
    color: '#32CD32',
    fontStyle: 'italic',
    textDecorationLine: 'underline',
    marginBottom: -4, // Pull amount slightly closer
  },
  totalAmountText: {
    fontSize: 36,
    color: '#32CD32',
    fontWeight: '800',
    textAlign: 'left',
  },
  chartContainer: {
    alignItems: 'flex-start',
    paddingVertical: 20,
    paddingLeft: 0,
  },
  legendContainer: {
    padding: 20,
  },
  legendItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#32CD32',
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  addButton: {
    width: 40,
    height: 40,
    marginLeft: 8,
    backgroundColor: '#32CD32',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  addButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  colorBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    marginRight: 12,
  },
  legendText: {
    flex: 1,
    fontSize: 16,
    color: '#32CD32',
    fontWeight: '600',
    marginRight: 8,
    maxWidth: '60%',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#32CD32',
    marginRight: 8,
  },
  arrowText: {
    fontSize: 24,
    color: '#32CD32',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#32CD32',
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#32CD32',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#32CD32',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#32CD32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#32CD32',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#32CD32',
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 14,
    color: '#32CD32',
    opacity: 0.7,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#32CD32',
    marginRight: 8,
  },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#32CD32',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#32CD32',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#32CD32',
  },
  addItemModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#32CD32',
    width: '90%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  addItemForm: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#32CD32',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#32CD32',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#32CD32',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#32CD32',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 24,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  addCategoryButtonContainer: {
    padding: 20,
    paddingTop: 0,
  },
  addCategoryButton: {
    backgroundColor: '#32CD32',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a',
    shadowColor: '#32CD32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addCategoryButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    letterSpacing: 1,
  },
  deleteCategoryModalButton: {
    backgroundColor: '#FF0000',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 20,
    marginBottom: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  deleteCategoryModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default SpendingTab;
