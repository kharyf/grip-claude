import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';

const SpendingTab = ({ chartType = 'Pie' }) => {
  // Initialize with base items for all categories
  const getInitialCategoryItems = () => {
    const currentYear = new Date().getFullYear();
    return {
      'Groceries': [
        { id: 'base-1', name: 'Whole Foods', date: `Dec 10, ${currentYear}`, amount: 120, isBase: true },
        { id: 'base-2', name: 'Trader Joe\'s', date: `Dec 12, ${currentYear}`, amount: 85, isBase: true },
        { id: 'base-3', name: 'Local Market', date: `Dec 15, ${currentYear}`, amount: 95, isBase: true },
        { id: 'base-4', name: 'Costco', date: `Dec 18, ${currentYear}`, amount: 150, isBase: true },
      ],
      'Rent': [
        { id: 'base-5', name: 'Monthly Rent Payment', date: `Dec 1, ${currentYear}`, amount: 1200, isBase: true },
      ],
      'Utilities': [
        { id: 'base-6', name: 'Electric Bill', date: `Dec 5, ${currentYear}`, amount: 80, isBase: true },
        { id: 'base-7', name: 'Water Bill', date: `Dec 8, ${currentYear}`, amount: 45, isBase: true },
        { id: 'base-8', name: 'Internet', date: `Dec 10, ${currentYear}`, amount: 55, isBase: true },
      ],
      'Transportation': [
        { id: 'base-9', name: 'Gas Station', date: `Dec 7, ${currentYear}`, amount: 60, isBase: true },
        { id: 'base-10', name: 'Gas Station', date: `Dec 14, ${currentYear}`, amount: 55, isBase: true },
        { id: 'base-11', name: 'Public Transit Pass', date: `Dec 1, ${currentYear}`, amount: 90, isBase: true },
        { id: 'base-12', name: 'Parking', date: `Dec 16, ${currentYear}`, amount: 45, isBase: true },
      ],
      'Entertainment': [
        { id: 'base-13', name: 'Movie Tickets', date: `Dec 9, ${currentYear}`, amount: 40, isBase: true },
        { id: 'base-14', name: 'Concert', date: `Dec 13, ${currentYear}`, amount: 120, isBase: true },
        { id: 'base-15', name: 'Streaming Services', date: `Dec 1, ${currentYear}`, amount: 45, isBase: true },
        { id: 'base-16', name: 'Gaming', date: `Dec 20, ${currentYear}`, amount: 115, isBase: true },
      ],
      'Dining Out': [
        { id: 'base-17', name: 'Restaurant A', date: `Dec 6, ${currentYear}`, amount: 65, isBase: true },
        { id: 'base-18', name: 'Coffee Shop', date: `Dec 8, ${currentYear}`, amount: 15, isBase: true },
        { id: 'base-19', name: 'Restaurant B', date: `Dec 11, ${currentYear}`, amount: 80, isBase: true },
        { id: 'base-20', name: 'Fast Food', date: `Dec 14, ${currentYear}`, amount: 25, isBase: true },
        { id: 'base-21', name: 'Restaurant C', date: `Dec 17, ${currentYear}`, amount: 95, isBase: true },
      ],
      'Healthcare': [
        { id: 'base-22', name: 'Pharmacy', date: `Dec 4, ${currentYear}`, amount: 45, isBase: true },
        { id: 'base-23', name: 'Doctor Visit Co-pay', date: `Dec 11, ${currentYear}`, amount: 105, isBase: true },
      ],
      'Wisconsin Trip': [
        { id: 'base-24', name: 'Amazon', date: `Dec 3, ${currentYear}`, amount: 120, isBase: true },
        { id: 'base-25', name: 'Target', date: `Dec 8, ${currentYear}`, amount: 85, isBase: true },
        { id: 'base-26', name: 'Online Store', date: `Dec 14, ${currentYear}`, amount: 95, isBase: true },
        { id: 'base-27', name: 'Department Store', date: `Dec 19, ${currentYear}`, amount: 100, isBase: true },
      ],
      'Subscriptions': [
        { id: 'base-28', name: 'Netflix', date: `Dec 1, ${currentYear}`, amount: 15, isBase: true },
        { id: 'base-29', name: 'Spotify', date: `Dec 1, ${currentYear}`, amount: 10, isBase: true },
        { id: 'base-30', name: 'Cloud Storage', date: `Dec 5, ${currentYear}`, amount: 10, isBase: true },
        { id: 'base-31', name: 'News Subscription', date: `Dec 8, ${currentYear}`, amount: 12, isBase: true },
        { id: 'base-32', name: 'Fitness App', date: `Dec 10, ${currentYear}`, amount: 20, isBase: true },
        { id: 'base-33', name: 'Magazine', date: `Dec 15, ${currentYear}`, amount: 18, isBase: true },
      ],
      'Savings': [
        { id: 'base-34', name: 'Emergency Fund', date: `Dec 1, ${currentYear}`, amount: 300, isBase: true },
        { id: 'base-35', name: 'Investment Account', date: `Dec 1, ${currentYear}`, amount: 200, isBase: true },
        { id: 'base-36', name: 'Retirement (401k)', date: `Dec 1, ${currentYear}`, amount: 100, isBase: true },
      ],
    };
  };

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDate, setNewItemDate] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryItems, setCategoryItems] = useState(getInitialCategoryItems());
  const [customCategories, setCustomCategories] = useState([]);
  const [editItemModalVisible, setEditItemModalVisible] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemDate, setEditItemDate] = useState('');
  const [editItemAmount, setEditItemAmount] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load data from AsyncStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedCategoryItems = await AsyncStorage.getItem('categoryItems');
        const savedCustomCategories = await AsyncStorage.getItem('customCategories');

        if (savedCategoryItems !== null) {
          setCategoryItems(JSON.parse(savedCategoryItems));
        }
        if (savedCustomCategories !== null) {
          setCustomCategories(JSON.parse(savedCustomCategories));
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

  const baseSpendingData = [
    {
      name: 'Groceries',
      baseAmount: 450,
      color: '#FF0000',  // Pure Red
      legendFontColor: '#32CD32',
      legendFontSize: 14,
    },
    {
      name: 'Rent',
      baseAmount: 1200,
      color: '#00CED1',  // Dark Turquoise
      legendFontColor: '#32CD32',
      legendFontSize: 14,
    },
    {
      name: 'Utilities',
      baseAmount: 180,
      color: '#FFD700',  // Gold
      legendFontColor: '#32CD32',
      legendFontSize: 14,
    },
    {
      name: 'Transportation',
      baseAmount: 250,
      color: '#00FF7F',  // Spring Green
      legendFontColor: '#32CD32',
      legendFontSize: 14,
    },
    {
      name: 'Entertainment',
      baseAmount: 320,
      color: '#FF1493',  // Deep Pink
      legendFontColor: '#32CD32',
      legendFontSize: 14,
    },
    {
      name: 'Dining Out',
      baseAmount: 280,
      color: '#6A5ACD',  // Slate Blue
      legendFontColor: '#32CD32',
      legendFontSize: 14,
    },
    {
      name: 'Healthcare',
      baseAmount: 150,
      color: '#FF8C00',  // Dark Orange
      legendFontColor: '#32CD32',
      legendFontSize: 14,
    },
    {
      name: 'Wisconsin Trip',
      baseAmount: 400,
      color: '#8B00FF',  // Electric Violet
      legendFontColor: '#32CD32',
      legendFontSize: 14,
    },
    {
      name: 'Subscriptions',
      baseAmount: 85,
      color: '#1E90FF',  // Dodger Blue
      legendFontColor: '#32CD32',
      legendFontSize: 14,
    },
    {
      name: 'Savings',
      baseAmount: 600,
      color: '#32CD32',  // Lime Green
      legendFontColor: '#32CD32',
      legendFontSize: 14,
    },
  ];

  const chartConfig = {
    backgroundColor: '#2a2a2a',
    backgroundGradientFrom: '#2a2a2a',
    backgroundGradientTo: '#2a2a2a',
    color: (opacity = 1) => `rgba(50, 205, 50, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(50, 205, 50, ${opacity})`,
  };

  // Calculate dynamic totals for each category
  const calculateCategoryTotal = (categoryName) => {
    const items = categoryItems[categoryName] || [];
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  // Get all active categories (those with items OR are custom categories)
  const activeCategoryNames = Object.keys(categoryItems).filter(
    categoryName => categoryItems[categoryName] && categoryItems[categoryName].length > 0
  );

  // Build spending data from active categories
  const allSpendingData = [
    ...baseSpendingData
      .filter(item => activeCategoryNames.includes(item.name))
      .map(item => ({
        ...item,
        amount: calculateCategoryTotal(item.name),
      })),
    // Include ALL custom categories, even if they have no items yet
    ...customCategories
      .map(category => ({
        name: category.name,
        amount: calculateCategoryTotal(category.name),
        color: category.color,
        legendFontColor: '#32CD32',
        legendFontSize: 14,
      })),
  ];

  // Update spending data with calculated totals
  const updatedSpendingData = allSpendingData;

  // Sort spending data in descending order
  const sortedSpendingData = [...updatedSpendingData].sort((a, b) => b.amount - a.amount);

  const totalSpending = sortedSpendingData.reduce((sum, item) => sum + item.amount, 0);

  // Add percentage to each item for display and truncate names for chart
  const dataWithPercentage = sortedSpendingData.map(item => {
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
    // Sort items in descending order by amount
    return items.sort((a, b) => b.amount - a.amount);
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
    if (!newCategoryName.trim()) {
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
          <Text style={styles.title}>Gripah</Text>
          <Text style={styles.totalText}>Total: ${totalSpending.toLocaleString()}</Text>
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
                labels: sortedSpendingData.slice(0, 8).map(item => {
                  const name = item.name.length > 8 ? item.name.substring(0, 8) + '...' : item.name;
                  return name;
                }),
                datasets: [{
                  data: sortedSpendingData.slice(0, 8).map(item => item.amount)
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
                labels: sortedSpendingData.slice(0, 8).map(item => {
                  const name = item.name.length > 8 ? item.name.substring(0, 8) + '...' : item.name;
                  return name;
                }),
                datasets: [{
                  data: sortedSpendingData.slice(0, 8).map(item => item.amount)
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
                <Text style={styles.amountText}>${item.amount}</Text>
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
                    <Text style={styles.itemAmount}>${item.amount}</Text>
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
                    ${selectedCategory && (sortedSpendingData.find(d => d.name === selectedCategory)?.amount || 0)}
                  </Text>
                </View>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#32CD32',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#32CD32',
    marginBottom: 10,
  },
  totalText: {
    fontSize: 18,
    color: '#32CD32',
    fontWeight: '600',
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
});

export default SpendingTab;
