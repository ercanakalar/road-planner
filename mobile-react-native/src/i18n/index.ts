import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './locales/en';
import tr from './locales/tr';
import {
  AppLanguage,
  DEFAULT_LANGUAGE,
  isAppLanguage,
  SUPPORTED_LANGUAGES,
} from 'types/i18n';

export const resources = {
  en: { translation: en },
  tr: { translation: tr },
} as const;

export const resolveDeviceLanguage = (
  tags: readonly (string | null | undefined)[] = getLocales().map(
    (locale) => locale.languageCode,
  ),
): AppLanguage => {
  for (const tag of tags) {
    const code = tag?.split(/[-_]/)[0].toLowerCase();
    if (isAppLanguage(code)) return code;
  }

  return DEFAULT_LANGUAGE;
};

export const resolveLanguage = (
  chosen: AppLanguage | null,
  device: () => AppLanguage = resolveDeviceLanguage,
): AppLanguage => chosen ?? device();

i18n.use(initReactI18next).init({
  resources,
  lng: resolveLanguage(null),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
