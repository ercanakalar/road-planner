import AsyncStorage from '@react-native-async-storage/async-storage';

class LocalStorageService {
  public async getItem(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(key);
  }
  public setItem(key: string, value: string): Promise<void> {
    return AsyncStorage.setItem(key, value);
  }
  public removeItem(key: string): Promise<void> {
    return AsyncStorage.removeItem(key);
  }
  public clear(): Promise<void> {
    return AsyncStorage.clear();
  }
  public getAllKeys(): Promise<string[]> {
    return AsyncStorage.getAllKeys().then((keys) => keys.slice());
  }
  public multiGet(keys: string[]): Promise<Array<[string, string | null]>> {
    return AsyncStorage.multiGet(keys).then((result) => Array.from(result));
  }
  public multiSet(keyValuePairs: Array<[string, string]>): Promise<void> {
    return AsyncStorage.multiSet(keyValuePairs);
  }
  public multiRemove(keys: string[]): Promise<void> {
    return AsyncStorage.multiRemove(keys);
  }
}

export default new LocalStorageService();
