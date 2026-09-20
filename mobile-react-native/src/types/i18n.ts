export const SUPPORTED_LANGUAGES = ['en', 'tr'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

export const isAppLanguage = (value: unknown): value is AppLanguage =>
  typeof value === 'string' &&
  (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: 'English',
  tr: 'Türkçe',
};
