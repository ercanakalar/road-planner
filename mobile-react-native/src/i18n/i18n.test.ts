import i18n, { resolveDeviceLanguage, resolveLanguage } from './index';
import en from './locales/en';
import tr from './locales/tr';
import { SUPPORTED_LANGUAGES } from 'types/i18n';

describe('resolveDeviceLanguage', () => {
  it('takes the phone at its word when we ship that language', () => {
    expect(resolveDeviceLanguage(['tr'])).toBe('tr');
    expect(resolveDeviceLanguage(['en'])).toBe('en');
  });

  it('ignores the region', () => {
    expect(resolveDeviceLanguage(['tr-CY'])).toBe('tr');
    expect(resolveDeviceLanguage(['en_US'])).toBe('en');
    expect(resolveDeviceLanguage(['TR'])).toBe('tr');
  });

  it('walks down the phone’s preference list', () => {
    expect(resolveDeviceLanguage(['de', 'fr', 'tr', 'en'])).toBe('tr');
  });

  it('falls back to English when it recognises none of them', () => {
    expect(resolveDeviceLanguage(['de', 'fr'])).toBe('en');
  });

  it('survives a phone that reports nothing useful', () => {
    expect(resolveDeviceLanguage([])).toBe('en');
    expect(resolveDeviceLanguage([null, undefined, ''])).toBe('en');
  });
});

describe('resolveLanguage', () => {
  it('follows the phone until somebody chooses', () => {
    expect(resolveLanguage(null, () => 'tr')).toBe('tr');
  });

  it('keeps a choice even when the phone says otherwise', () => {
    expect(resolveLanguage('en', () => 'tr')).toBe('en');
    expect(resolveLanguage('tr', () => 'en')).toBe('tr');
  });
});

describe('locale files', () => {
  it('registers every supported language', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      expect(i18n.hasResourceBundle(language, 'translation')).toBe(true);
    }
  });

  it('translates the same keys in every language', () => {
    const flatten = (source: object): string[] =>
      Object.entries(source).flatMap(([namespace, strings]) =>
        Object.keys(strings as object).map((key) => `${namespace}.${key}`),
      );

    expect(flatten(tr).sort()).toEqual(flatten(en).sort());
  });

  it('carries the same interpolation placeholders through a translation', () => {
    const placeholders = (value: string) =>
      (value.match(/{{\s*\w+\s*}}/g) ?? []).sort();

    for (const [namespace, strings] of Object.entries(en)) {
      for (const [key, english] of Object.entries(strings as object)) {
        const turkish = (tr as Record<string, Record<string, string>>)[
          namespace
        ][key];

        expect({ key: `${namespace}.${key}`, of: placeholders(turkish) }).toEqual(
          { key: `${namespace}.${key}`, of: placeholders(english as string) },
        );
      }
    }
  });
});
