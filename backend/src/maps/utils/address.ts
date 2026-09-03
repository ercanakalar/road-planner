/**
 * Tidies a formatted address before it is stored.
 *
 * Google's `formatted_address` is built from whatever components it has, and for
 * a pin dropped off a named road that can be mostly filler: a Plus Code where
 * the street name would be, "Unnamed Road", a bare postcode, or the same
 * district repeated twice. A caller may also hand us its own string, which is
 * user input and has to be treated as such.
 *
 * Nothing here tries to be a geocoder. It drops segments that carry no meaning
 * to someone reading a list of stops, and leaves everything else alone.
 */

/** Longer than any real address, and short enough to keep a row one line. */
const MAX_LENGTH = 300;

/**
 * A Plus Code, e.g. "7GXR+8C" — a coordinate in disguise, not a place name.
 *
 * Google puts one at the front of the first segment for a pin off a named
 * road, usually with the locality behind it: "7GXR+8C Kadıköy". So this
 * matches the code where it starts a segment rather than the whole segment,
 * and what follows is kept.
 */
const PLUS_CODE =
  /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/i;

/**
 * What Google returns for a road it has no name for, in the locales we see.
 * Written in folded form, so match against `fold` rather than the raw segment.
 */
const UNNAMED = new Set([
  'unnamed road',
  'unnamed rd',
  'isimsiz yol',
  'adsiz yol',
]);

/** A lone postcode. Attached to a town ("34710 Kadıköy") it stays. */
const BARE_NUMBER = /^\d+$/;

/** A segment that is only punctuation, dashes or similar. */
const NO_LETTERS_OR_DIGITS = /^[^\p{L}\p{N}]+$/u;

/**
 * One spelling for a segment, for comparing it against another.
 *
 * Turkish has two i's, and they do not survive an ASCII lowercase: "KADIKÖY"
 * folds to "kadıköy" and "Kadıköy" already is that, but a plain
 * `toLowerCase()` turns the first into "kadiköy" and they stop matching. Fold
 * with the Turkish rules, then flatten both i's together so either spelling of
 * the same place collides.
 */
const fold = (segment: string): string =>
  segment.toLocaleLowerCase('tr').replace(/ı/g, 'i');

const isNoise = (segment: string, folded: string): boolean =>
  UNNAMED.has(folded) ||
  BARE_NUMBER.test(segment) ||
  NO_LETTERS_OR_DIGITS.test(segment);

export function cleanAddress(raw: unknown): string {
  if (typeof raw !== 'string') return '';

  const segments = raw
    // Control characters arrive from copy-paste and would be stored verbatim.
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .split(',')
    .map((segment) =>
      segment.replace(PLUS_CODE, '').replace(/\s+/g, ' ').trim(),
    )
    .filter(Boolean);

  const seen = new Set<string>();
  const kept: string[] = [];

  for (const segment of segments) {
    const folded = fold(segment);

    if (isNoise(segment, folded)) continue;
    // "Kadıköy, Kadıköy, İstanbul" says Kadıköy once.
    if (seen.has(folded)) continue;

    seen.add(folded);
    kept.push(segment);
  }

  const address = kept.join(', ');

  // Cut on a segment boundary so the result never ends mid-word.
  if (address.length <= MAX_LENGTH) return address;

  const trimmed: string[] = [];
  let length = 0;

  for (const segment of kept) {
    const next = length === 0 ? segment.length : length + 2 + segment.length;
    if (next > MAX_LENGTH) break;

    trimmed.push(segment);
    length = next;
  }

  return trimmed.join(', ') || kept[0].slice(0, MAX_LENGTH);
}
