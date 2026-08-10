import { formatCountdown, formatWait } from './formatDuration';

describe('formatWait', () => {
  it.each([
    [0, 'less than a minute'],
    [30_000, 'less than a minute'],
    [90_000, '2 minutes'],
    [25 * 60_000, '25 minutes'],
    [90 * 60_000, '2 hours'],
    [23 * 3_600_000, '23 hours'],
    [24 * 3_600_000, '1 day'],
  ])('formats %ims as %s', (ms, expected) => {
    expect(formatWait(ms)).toBe(expected);
  });

  it('rounds up, so the wait is never understated', () => {
    expect(formatWait(61_000)).toBe('2 minutes');
  });

  it('never reports a negative wait', () => {
    expect(formatWait(-5_000)).toBe('less than a minute');
  });
});

describe('formatCountdown', () => {
  it.each([
    [0, '0:00'],
    [9_000, '0:09'],
    [65_000, '1:05'],
    [600_000, '10:00'],
  ])('formats %ims as %s', (ms, expected) => {
    expect(formatCountdown(ms)).toBe(expected);
  });

  it('floors at zero rather than going negative', () => {
    expect(formatCountdown(-1_000)).toBe('0:00');
  });
});
