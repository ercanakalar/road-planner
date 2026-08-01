import localStorageService from './localStorageService';
import { SettingsState } from 'store/slices/settingsSlice';

const STORAGE_KEY = 'preferences_v1';

export const preferencesStorage = {
  async load(): Promise<Partial<SettingsState>> {
    try {
      const raw = await localStorageService.getItem(STORAGE_KEY);
      if (!raw) return {};

      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return {};

      const { notificationsEnabled, autoFitRoute } =
        parsed as Partial<SettingsState>;
      const restored: Partial<SettingsState> = {};
      if (typeof notificationsEnabled === 'boolean') {
        restored.notificationsEnabled = notificationsEnabled;
      }
      if (typeof autoFitRoute === 'boolean') {
        restored.autoFitRoute = autoFitRoute;
      }
      return restored;
    } catch {
      return {};
    }
  },

  async save(settings: SettingsState): Promise<void> {
    try {
      await localStorageService.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
    }
  },
};

export default preferencesStorage;
