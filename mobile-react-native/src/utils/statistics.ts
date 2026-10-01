import { AppLanguage } from 'types/i18n';

const SEPARATORS: Record<AppLanguage, { group: string; decimal: string }> = {
  en: { group: ',', decimal: '.' },
  tr: { group: '.', decimal: ',' },
};

const COMPACT_FROM = 10_000;

const groupDigits = (value: number, separator: string): string =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, separator);

const oneDecimal = (value: number, separator: string): string => {
  const rounded = Math.round(value * 10) / 10;
  const [whole, fraction] = rounded.toFixed(1).split('.');
  return fraction === '0' ? whole : `${whole}${separator}${fraction}`;
};

export type CountParts =
  | { kind: 'plain'; text: string }
  | { kind: 'thousands' | 'millions'; value: string };

// A count as a person reads it: "1,284" in full, "12.9K" once it is large.
// The unit word is the translator's ("K" in English, "B" in Turkish), so
// this hands back the parts and leaves the wording to the caller.
export const countParts = (
  value: number,
  language: AppLanguage,
): CountParts => {
  const { group, decimal } = SEPARATORS[language] ?? SEPARATORS.en;

  if (Math.abs(value) < COMPACT_FROM) {
    return { kind: 'plain', text: groupDigits(value, group) };
  }

  if (Math.abs(value) < 1_000_000) {
    return { kind: 'thousands', value: oneDecimal(value / 1000, decimal) };
  }

  return { kind: 'millions', value: oneDecimal(value / 1_000_000, decimal) };
};

export type Trend =
  | { kind: 'none' }
  | { kind: 'new' }
  | { kind: 'gone' }
  | { kind: 'same' }
  | { kind: 'up' | 'down'; percent: number };

// How a feature's use moved against the period before it.
export const trendOf = (count: number, previous: number): Trend => {
  if (count === 0 && previous === 0) return { kind: 'none' };
  if (previous === 0) return { kind: 'new' };
  if (count === 0) return { kind: 'gone' };

  const percent = Math.round(((count - previous) / previous) * 100);

  if (percent === 0) return { kind: 'same' };

  return { kind: percent > 0 ? 'up' : 'down', percent: Math.abs(percent) };
};

const LOCALES: Record<AppLanguage, string> = { en: 'en-GB', tr: 'tr-TR' };

// "29 Sep" / "29 Eyl" for a UTC calendar day the server sends as 2026-09-29.
export const formatDay = (
  day: string,
  language: AppLanguage,
  month: 'short' | 'long' = 'short',
): string => {
  const date = new Date(`${day.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return day;

  try {
    return date.toLocaleDateString(LOCALES[language] ?? LOCALES.en, {
      day: 'numeric',
      month,
      timeZone: 'UTC',
    });
  } catch {
    return day.slice(0, 10);
  }
};
