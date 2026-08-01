import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import localStorageService from './localStorageService';
import { TokenType } from 'types/libs/auth';

export type TokenPair = {
  accessToken: string | null;
  refreshToken: string | null;
};

const useSecureStore = Platform.OS === 'ios' || Platform.OS === 'android';

async function readOne(key: string): Promise<string | null> {
  try {
    return useSecureStore
      ? await SecureStore.getItemAsync(key)
      : await localStorageService.getItem(key);
  } catch {
    return null;
  }
}

async function writeOne(key: string, value: string): Promise<void> {
  try {
    if (useSecureStore) await SecureStore.setItemAsync(key, value);
    else await localStorageService.setItem(key, value);
  } catch {}
}

async function deleteOne(key: string): Promise<void> {
  try {
    if (useSecureStore) await SecureStore.deleteItemAsync(key);
    else await localStorageService.removeItem(key);
  } catch {}
}

export const tokenStorage = {
  async get(): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      readOne(TokenType.ACCESS_TOKEN),
      readOne(TokenType.REFRESH_TOKEN),
    ]);
    return { accessToken, refreshToken };
  },

  async getAccessToken(): Promise<string | null> {
    return readOne(TokenType.ACCESS_TOKEN);
  },

  async save(tokens: TokenPair): Promise<void> {
    await Promise.all([
      tokens.accessToken
        ? writeOne(TokenType.ACCESS_TOKEN, tokens.accessToken)
        : deleteOne(TokenType.ACCESS_TOKEN),
      tokens.refreshToken
        ? writeOne(TokenType.REFRESH_TOKEN, tokens.refreshToken)
        : deleteOne(TokenType.REFRESH_TOKEN),
    ]);
  },

  async clear(): Promise<void> {
    await Promise.all([
      deleteOne(TokenType.ACCESS_TOKEN),
      deleteOne(TokenType.REFRESH_TOKEN),
    ]);
  },

  async migrateLegacyTokens(): Promise<void> {
    if (!useSecureStore) return;

    const [legacyAccess, legacyRefresh] = await Promise.all([
      localStorageService.getItem(TokenType.ACCESS_TOKEN),
      localStorageService.getItem(TokenType.REFRESH_TOKEN),
    ]);

    if (!legacyAccess && !legacyRefresh) return;

    const current = await tokenStorage.get();
    if (!current.accessToken && !current.refreshToken) {
      await tokenStorage.save({
        accessToken: legacyAccess,
        refreshToken: legacyRefresh,
      });
    }

    await Promise.all([
      localStorageService.removeItem(TokenType.ACCESS_TOKEN),
      localStorageService.removeItem(TokenType.REFRESH_TOKEN),
    ]);
  },
};

export default tokenStorage;
