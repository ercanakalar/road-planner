import { I18nService } from 'nestjs-i18n';

import en from 'src/i18n/locales/en';
import tr from 'src/i18n/locales/tr';
import { AppLanguage, FALLBACK_LANGUAGE } from 'src/i18n/languages';
import { interpolate } from 'src/i18n/interpolate';

const DICTIONARIES: Record<AppLanguage, unknown> = { en, tr };

const at = (dictionary: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        typeof node === 'object' && node !== null
          ? (node as Record<string, unknown>)[part]
          : undefined,
      dictionary,
    );

/**
 * The sentence at a path, choosing a plural branch the way `nestjs-i18n` does:
 * `zero` when there is one and the count is nought, otherwise whatever
 * `Intl.PluralRules` selects for the language.
 */
const lookup = (
  dictionary: unknown,
  path: string,
  language: string,
  count: unknown,
): string | undefined => {
  const value = at(dictionary, path);

  if (typeof value === 'string') return value;
  if (typeof value !== 'object' || value === null) return undefined;

  const forms = value as Record<string, unknown>;
  if (count === undefined) return undefined;

  const number = Number(count);
  const branch =
    number === 0 && typeof forms.zero === 'string'
      ? 'zero'
      : new Intl.PluralRules(language).select(number);

  const chosen = forms[branch] ?? forms.other;

  return typeof chosen === 'string' ? chosen : undefined;
};

/**
 * A translator over the real locale files, for tests.
 *
 * Standing in a stub that echoes its key would let a missing or mistyped
 * translation pass, which is the only thing these tests are watching for. This
 * resolves keys the way the running app does — dot path, fall back to English,
 * then to the key itself — so the assertions are about the dictionaries.
 */
export const testI18n = (): Pick<I18nService, 'translate'> => ({
  // `I18nService.translate` is generic over what a key resolves to; every key
  // here resolves to a sentence, and the cast keeps that one difference in one
  // place rather than at each call site.
  translate: ((
    key: string,
    options?: {
      lang?: string;
      args?: Record<string, unknown>;
      defaultValue?: string;
    },
  ): string => {
    const language = (options?.lang ?? FALLBACK_LANGUAGE) as AppLanguage;

    const count = options?.args?.count;

    const sentence =
      lookup(
        DICTIONARIES[language] ?? DICTIONARIES[FALLBACK_LANGUAGE],
        key,
        language,
        count,
      ) ??
      lookup(DICTIONARIES[FALLBACK_LANGUAGE], key, FALLBACK_LANGUAGE, count);

    if (sentence === undefined) return options?.defaultValue ?? key;

    return interpolate(sentence, options?.args);
  }) as Pick<I18nService, 'translate'>['translate'],
});

export default testI18n;
