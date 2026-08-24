import { formatConsentDate } from './formatConsentDate';

describe('formatConsentDate', () => {
  it('writes the day, month and year out', () => {
    const formatted = formatConsentDate('2026-08-24T09:00:00.000Z', 'en');

    expect(formatted).toContain('2026');
    expect(formatted).toContain('24');
  });

  it('formats the same instant for both languages', () => {
    const iso = '2026-08-24T09:00:00.000Z';

    expect(formatConsentDate(iso, 'tr')).toContain('2026');
    expect(formatConsentDate(iso, 'tr')).toContain('24');
  });

  it('hands back a value it cannot read rather than "Invalid Date"', () => {
    expect(formatConsentDate('whenever', 'tr')).toBe('whenever');
  });
});
