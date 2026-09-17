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

/**
 * The first language the phone asks for that we actually have.
 *
 * The phone offers a preference *list*, not one language, so somebody whose
 * first choice we do not ship still gets their second rather than English.
 * Region is dropped — `tr-CY` and `tr-TR` are both Turkish to us, and matching
 * the whole tag would fall back to English for most of the world.
 *
 * The locales are read at call time rather than at import, so this can be
 * driven directly in a test without standing up the native module.
 */
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

/**
 * What the app should be showing, given what has been chosen.
 *
 * `null` is "nothing chosen yet", which is every install until somebody opens
 * Settings — those follow the phone. A stored choice outranks the phone from
 * then on, which is the whole point of having made it.
 */
export const resolveLanguage = (
  chosen: AppLanguage | null,
  device: () => AppLanguage = resolveDeviceLanguage,
): AppLanguage => chosen ?? device();

i18n.use(initReactI18next).init({
  resources,
  lng: resolveLanguage(null),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  // React escapes for us; letting i18next do it as well turns an apostrophe
  // into `&#39;` on screen.
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
