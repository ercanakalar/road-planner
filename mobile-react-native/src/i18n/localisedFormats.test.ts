import i18n from 'i18n';
import { formatWait } from 'utils/formatDuration';
import { metersToDistance, secondsToHour } from 'utils/secondsToHour';
import { bendLabel, slopeLabel, UNSHAPED_STOP } from 'utils/stopShape';
import { timeAgo } from 'utils/timeAgo';

const NOW = new Date('2026-09-14T12:00:00Z').getTime();

describe('formats in Turkish', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('tr');
  });

  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('writes durations with Turkish units', () => {
    expect(secondsToHour(30)).toBe('< 1 dk');
    expect(secondsToHour(5400)).toBe('1 sa 30 dk');
  });

  it('writes a decimal distance with a comma', () => {
    expect(metersToDistance(1500)).toBe('1,5 km');
    expect(metersToDistance(850)).toBe('850 m');
  });

  it('puts the wait before “sonra”, the way the sentence needs it', () => {
    expect(formatWait(15 * 60_000)).toBe('15 dakika sonra');
    expect(formatWait(10_000)).toBe('bir dakika içinde');
  });

  it('says how long ago in Turkish', () => {
    expect(timeAgo(new Date(NOW - 3 * 3_600_000).toISOString(), NOW)).toBe(
      '3 sa önce',
    );
    expect(timeAgo(new Date(NOW).toISOString(), NOW)).toBe('az önce');
  });

  it('puts the percent sign first and the direction before the bend', () => {
    expect(
      slopeLabel({ ...UNSHAPED_STOP, slopePercent: 7.4, slopeGrade: 'moderate' }),
    ).toBe('Orta eğimli · %7,4 çıkış');
    expect(
      bendLabel({
        ...UNSHAPED_STOP,
        bendDegrees: 92,
        bendDirection: 'left',
        bendShape: 'sharp',
      }),
    ).toBe('Sola keskin viraj · 92°');
  });
});
