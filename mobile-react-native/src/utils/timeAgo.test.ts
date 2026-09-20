import { timeAgo } from './timeAgo';

const NOW = new Date('2026-09-14T12:00:00Z').getTime();
const ago = (ms: number) => timeAgo(new Date(NOW - ms).toISOString(), NOW);

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('timeAgo', () => {
  it('says just now for the last minute', () => {
    expect(ago(0)).toBe('just now');
    expect(ago(59 * SECOND)).toBe('just now');
  });

  it('counts minutes, then hours, then days', () => {
    expect(ago(MINUTE)).toBe('1m ago');
    expect(ago(59 * MINUTE)).toBe('59m ago');
    expect(ago(HOUR)).toBe('1h ago');
    expect(ago(23 * HOUR)).toBe('23h ago');
    expect(ago(DAY)).toBe('1d ago');
    expect(ago(6 * DAY)).toBe('6d ago');
  });

  it('falls back to a date once the age has stopped meaning anything', () => {
    expect(ago(8 * DAY)).not.toMatch(/ago/);
    expect(ago(8 * DAY)).toMatch(/\d/);
  });

  it('reads a clock that is slightly ahead as now, not as a negative age', () => {
    expect(timeAgo(new Date(NOW + 3 * MINUTE).toISOString(), NOW)).toBe(
      'just now',
    );
  });

  it('says nothing at all for a timestamp it cannot read', () => {
    expect(timeAgo('not a date', NOW)).toBe('');
  });
});
