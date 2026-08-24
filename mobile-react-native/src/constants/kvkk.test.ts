import {
  KVKK_CONSENT_VERSION,
  KVKK_CONTACT_EMAIL,
  KVKK_COPY,
  KVKK_LANGUAGES,
  kvkkLanguageForLocale,
} from './kvkk';
import { KvkkLanguage } from 'types/kvkk';

const languages = KVKK_LANGUAGES;

describe('KVKK notice', () => {
  it('is versioned by the day the text last changed', () => {
    expect(KVKK_CONSENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it.each(languages)('covers the same ground in %s', (language) => {
    const copy = KVKK_COPY[language];

    expect(copy.sections.map((section) => section.id)).toEqual([
      'controller',
      'data',
      'purpose',
      'legalBasis',
      'sharing',
      'retention',
      'rights',
      'withdrawal',
    ]);
  });

  it.each(languages)('leaves nothing blank in %s', (language) => {
    const copy = KVKK_COPY[language];

    Object.values(copy).forEach((value) => {
      if (typeof value === 'string') expect(value.trim()).not.toHaveLength(0);
    });

    copy.sections.forEach((section) => {
      expect(section.title.trim()).not.toHaveLength(0);
      expect(section.body.trim().length).toBeGreaterThan(40);
    });
  });

  it.each(languages)('names an address to write to in %s', (language) => {
    const { sections } = KVKK_COPY[language];
    const rights = sections.find((section) => section.id === 'rights');

    expect(rights?.body).toContain(KVKK_CONTACT_EMAIL);
  });

  it.each(languages)('says how to take the consent back in %s', (language) => {
    const withdrawal = KVKK_COPY[language].sections.find(
      (section) => section.id === 'withdrawal',
    );

    expect(withdrawal?.body).toContain('KVKK');
    expect(KVKK_COPY[language].withdrawLabel.trim()).not.toHaveLength(0);
  });
});

describe('kvkkLanguageForLocale', () => {
  it.each([
    ['tr', 'tr'],
    ['tr-TR', 'tr'],
    ['TR-tr', 'tr'],
    ['en-GB', 'en'],
    ['de-DE', 'en'],
  ])('reads %s as %s', (locale, expected) => {
    expect(kvkkLanguageForLocale(locale)).toBe(expected as KvkkLanguage);
  });

  it('falls back to the translation when the phone says nothing', () => {
    expect(kvkkLanguageForLocale(undefined)).toBe('en');
    expect(kvkkLanguageForLocale(null)).toBe('en');
  });
});
