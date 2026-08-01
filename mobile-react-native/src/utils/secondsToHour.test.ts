import { metersToDistance, secondsToHour } from './secondsToHour';

describe('secondsToHour', () => {
  it('renders a zero-second leg rather than a placeholder', () => {
    expect(secondsToHour(0)).toBe('< 1 min');
  });

  it('uses the placeholder only when there is genuinely no value', () => {
    expect(secondsToHour(undefined)).toBe('—');
    expect(secondsToHour(NaN)).toBe('—');
  });

  it.each([
    [59, '< 1 min'],
    [90, '2 min'],
    [3540, '59 min'],
    [3600, '1 h'],
    [5400, '1 h 30 min'],
    [86400, '24 h'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(secondsToHour(seconds)).toBe(expected);
  });
});

describe('metersToDistance', () => {
  it.each([
    [0, '0 m'],
    [999, '999 m'],
    [1000, '1.0 km'],
    [1500, '1.5 km'],
    [9999, '10.0 km'],
    [42000, '42 km'],
  ])('formats %i metres as %s', (meters, expected) => {
    expect(metersToDistance(meters)).toBe(expected);
  });

  it('placeholders a missing distance', () => {
    expect(metersToDistance(undefined)).toBe('—');
  });
});
