/**
 * Reads a stored address for display.
 *
 * The API cleans an address on the way in, so a stop saved today arrives tidy.
 * This runs the same segment rules again on the way out, because the column
 * also holds rows written before that cleaning existed, and a route carried off
 * a phone brings whatever it was saved with. Junk shows up on the card, not in
 * a log, so it is worth filtering twice.
 */

import { fold } from './text';

/**
 * A Plus Code, e.g. "7GXR+8C" — a coordinate in disguise, not a place name.
 * It leads the segment it is in, with the locality usually behind it
 * ("7GXR+8C Kadıköy"), so it is stripped off the front and the rest is kept.
 */
const PLUS_CODE =
  /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/i;

/** What Google returns for a road it has no name for, folded (see `fold`). */
const UNNAMED = new Set([
  'unnamed route',
  'unnamed rd',
  'isimsiz yol',
  'adsiz yol',
]);

/** A lone postcode. Attached to a town ("34710 Kadıköy") it stays. */
const BARE_NUMBER = /^\d+$/;

/** A segment that is only punctuation, dashes or similar. */
const NO_LETTERS_OR_DIGITS = /^[^\p{L}\p{N}]+$/u;

/** `fold` collapses the two Turkish i's, so either spelling of a place collides. */
const isNoise = (segment: string, folded: string): boolean =>
  UNNAMED.has(folded) ||
  BARE_NUMBER.test(segment) ||
  NO_LETTERS_OR_DIGITS.test(segment);

/** The segments worth showing, in order, with repeats and noise removed. */
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

/**
 * Splits a formatted address into the two lines a stop is shown on.
 *
 * `formatted_address` runs most-specific first — "Bağdat Cd. 1, Kadıköy,
 * İstanbul, Türkiye" — so the first segment names the place and the rest says
 * where it is.
 */
export const splitAddress = (
  address: string | undefined | null,
): { primary: string; secondary: string } => {
  const segments = segmentsOf(address);

  if (segments.length === 0) return { primary: '', secondary: '' };

  return {
    primary: segments[0],
    // The country is the last segment and is the same for every stop on a
    // domestic route, so it earns no room on a one-line subtitle.
    secondary: segments.slice(1, -1).join(', ') || segments.slice(1).join(', '),
  };
};

/** The place name alone, for a marker title or a one-line card. */
export const addressName = (address: string | undefined | null): string =>
  splitAddress(address).primary;

/** Where the stop is, for a subtitle. Empty when the address says only one thing. */
export const addressLocality = (address: string | undefined | null): string =>
  splitAddress(address).secondary;

/**
 * The whole address on one line, for copying. Cleaned, but with nothing
 * dropped for the sake of a narrow row — someone pasting this into a maps app
 * wants the country too.
 */
export const fullAddress = (address: string | undefined | null): string =>
  segmentsOf(address).join(', ');
