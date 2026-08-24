import localStorageService from './localStorageService';
import { KvkkConsentRecord, isKvkkConsentRecord } from 'types/kvkk';

const STORAGE_KEY = 'kvkk_consent_v1';

export const kvkkStorage = {
  async load(): Promise<KvkkConsentRecord | null> {
    try {
      const raw = await localStorageService.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed: unknown = JSON.parse(raw);
      return isKvkkConsentRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },

  async save(record: KvkkConsentRecord): Promise<void> {
    try {
      await localStorageService.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {}
  },

  async clear(): Promise<void> {
    try {
      await localStorageService.removeItem(STORAGE_KEY);
    } catch {}
  },
};

export default kvkkStorage;
