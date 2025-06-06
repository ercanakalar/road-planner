import * as SecureStore from 'expo-secure-store';

const saveStorage = async (key: string, value: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`Error saving to storage with key "${key}":`, error);
  }
};

const getStorage = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Error retrieving from storage with key "${key}":`, error);
    return null;
  }
};

const deleteStorage = async (key: string): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Error deleting from storage with key "${key}":`, error);
  }
};

const clearAllStorage = async (): Promise<void> => {
  try {
    console.warn('clearAllStorage is not fully supported by SecureStore.');
  } catch (error) {
    console.error('Error clearing all storage:', error);
  }
};

export { saveStorage, getStorage, deleteStorage, clearAllStorage };
