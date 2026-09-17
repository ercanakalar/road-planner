import localStorageService from './localStorageService';
import { SettingsState } from 'store/slices/settingsSlice';
import { isAppLanguage } from 'types/i18n';
import { isThemeMode } from 'types/theme';

const STORAGE_KEY = 'preferences_v1';

export const preferencesStorage = {
  async load(): Promise<Partial<SettingsState>> {
    try {
      const raw = await localStorageService.getItem(STORAGE_KEY);
      if (!raw) return {};

      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return {};

      const { notificationsEnabled, autoFitRoute, themeMode, language } =
        parsed as Partial<SettingsState>;
      const restored: Partial<SettingsState> = {};
      if (typeof notificationsEnabled === 'boolean') {
        restored.notificationsEnabled = notificationsEnabled;
      }
      if (typeof autoFitRoute === 'boolean') {
        restored.autoFitRoute = autoFitRoute;
      }
      if (isThemeMode(themeMode)) {
        restored.themeMode = themeMode;
      }
      // Checked rather than trusted: a language we have since stopped shipping
      // would otherwise leave the app showing keys. Failing the check restores
      // nothing, which puts them back on the phone's language.
      if (isAppLanguage(language)) {
        restored.language = language;
      }
      return restored;
    } catch {
      return {};
    }
  },

  async save(settings: SettingsState): Promise<void> {
    try {
      await localStorageService.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  },
};

export default preferencesStorage;
