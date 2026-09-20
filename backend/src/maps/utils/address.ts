const MAX_LENGTH = 300;

const PLUS_CODE =
  /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/i;

const UNNAMED = new Set([
  'unnamed road',
  'unnamed rd',
  'isimsiz yol',
  'adsiz yol',
]);

const BARE_NUMBER = /^\d+$/;

const NO_LETTERS_OR_DIGITS = /^[^\p{L}\p{N}]+$/u;

const fold = (segment: string): string =>
  segment.toLocaleLowerCase('tr').replace(/ı/g, 'i');

const isNoise = (segment: string, folded: string): boolean =>
  UNNAMED.has(folded) ||
  BARE_NUMBER.test(segment) ||
  NO_LETTERS_OR_DIGITS.test(segment);

export function cleanAddress(raw: unknown): string {
  if (typeof raw !== 'string') return '';

  const segments = raw
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
    if (seen.has(folded)) continue;

    seen.add(folded);
    kept.push(segment);
  }

  const address = kept.join(', ');

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
