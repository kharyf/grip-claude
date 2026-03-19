import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Returns a key scoped to the provided userId.
 * E.g., getUserKey('abc1234', 'categoryItems') -> 'user_abc1234_categoryItems'
 */
export const getUserKey = (userId, key) => {
    if (!userId) {
        console.warn(`[userStorage] No userId provided for key: ${key}. Falling back to global key.`);
        return key;
    }
    return `user_${userId}_${key}`;
};

export const getUserItem = async (userId, key) => {
    const scopedKey = getUserKey(userId, key);
    return await AsyncStorage.getItem(scopedKey);
};

export const setUserItem = async (userId, key, value) => {
    const scopedKey = getUserKey(userId, key);
    return await AsyncStorage.setItem(scopedKey, value);
};

export const removeUserItem = async (userId, key) => {
    const scopedKey = getUserKey(userId, key);
    return await AsyncStorage.removeItem(scopedKey);
};
