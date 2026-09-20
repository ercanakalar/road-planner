
import { fold } from './text';

const PLUS_CODE =
  /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/i;

const UNNAMED = new Set([
  'unnamed route',
  'unnamed rd',
  'isimsiz yol',
  'adsiz yol',
]);

const BARE_NUMBER = /^\d+$/;

const NO_LETTERS_OR_DIGITS = /^[^\p{L}\p{N}]+$/u;

const isNoise = (segment: string, folded: string): boolean =>
  UNNAMED.has(folded) ||
  BARE_NUMBER.test(segment) ||
  NO_LETTERS_OR_DIGITS.test(segment);

const segmentsOf = (address: string | undefined | null): string[] => {
  if (typeof address !== 'string') return [];

  const seen = new Set<string>();
  const kept: string[] = [];

  const cleaned = address.replace(/[\u0000-\u001F\u007F]/g, ' ');

  for (const raw of cleaned.split(',')) {
    const segment = raw.replace(PLUS_CODE, '').replace(/\s+/g, ' ').trim();
    if (!segment) continue;

    const folded = fold(segment);
    if (isNoise(segment, folded) || seen.has(folded)) continue;

    seen.add(folded);
    kept.push(segment);
  }

  return kept;
};

export const splitAddress = (
  address: string | undefined | null,
): { primary: string; secondary: string } => {
  const segments = segmentsOf(address);

  if (segments.length === 0) return { primary: '', secondary: '' };

  return {
    primary: segments[0],
    secondary: segments.slice(1, -1).join(', ') || segments.slice(1).join(', '),
  };
};

export const addressName = (address: string | undefined | null): string =>
  splitAddress(address).primary;

export const addressLocality = (address: string | undefined | null): string =>
  splitAddress(address).secondary;

export const fullAddress = (address: string | undefined | null): string =>
  segmentsOf(address).join(', ');
