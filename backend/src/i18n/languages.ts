/** The languages the API has strings for. */
export const SUPPORTED_LANGUAGES = ['en', 'tr'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** English, because it is the language the source strings are written in. */
export const FALLBACK_LANGUAGE: AppLanguage = 'en';

export const isAppLanguage = (value: unknown): value is AppLanguage =>
  typeof value === 'string' &&
  (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

/**
 * The first language in an `Accept-Language` header we actually have.
 *
 * Quality values are honoured in the order they are written rather than
 * re-sorted: browsers and phones send their list already ordered, and a
 * malformed `q` should not promote a language nobody asked for. Region is
 * dropped — `tr-CY` and `tr-TR` are both Turkish here.
 */
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
