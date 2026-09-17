/**
 * The languages the app ships strings for.
 *
 * Adding one means adding its file under `src/i18n/locales` and a line here;
 * nothing else reads a hardcoded list.
 */
export const SUPPORTED_LANGUAGES = ['en', 'tr'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * What a device asking for something we do not have gets. English rather than
 * Turkish because it is the language the source strings are written in, so it
 * is the one guaranteed to be complete.
 */
export const DEFAULT_LANGUAGE: AppLanguage = 'en';

export const isAppLanguage = (value: unknown): value is AppLanguage =>
  typeof value === 'string' &&
  (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

/**
 * How each language names itself. A language list that names languages in the
 * language you cannot read is no help to the person trying to leave it.
 */
export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: 'English',
  tr: 'Türkçe',
};
