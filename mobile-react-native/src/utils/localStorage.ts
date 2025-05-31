import * as SecureStore from 'expo-secure-store';

const saveStorage = (key: string, value: string) => {
  SecureStore.setItem(key, value);
};

const getStorage = (key: string) => {
  return SecureStore.getItem(key);
};

const deleteStorage = async (key: string) => {
  await SecureStore.deleteItemAsync(key);
  return getStorage(key);
};

export { saveStorage, getStorage, deleteStorage };
