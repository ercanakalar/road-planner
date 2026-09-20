export const SUPPORTED_LANGUAGES = ['en', 'tr'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const FALLBACK_LANGUAGE: AppLanguage = 'en';

export const isAppLanguage = (value: unknown): value is AppLanguage =>
  typeof value === 'string' &&
  (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

export const resolveAcceptLanguage = (
  header: string | undefined | null,
): AppLanguage => {
  if (!header) return FALLBACK_LANGUAGE;

  for (const part of header.split(',')) {
    const tag = part.split(';')[0].trim();
    const code = tag.split(/[-_]/)[0].toLowerCase();

    if (isAppLanguage(code)) return code;
  }

  return FALLBACK_LANGUAGE;
};
