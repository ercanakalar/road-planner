import i18n from 'i18n';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function timeAgo(
  iso: string | number | Date,
  now: number = Date.now(),
): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const elapsed = now - then;

  if (elapsed < MINUTE) return i18n.t('time.justNow');
  if (elapsed < HOUR) {
    return i18n.t('time.minutesAgo', { count: Math.floor(elapsed / MINUTE) });
  }
  if (elapsed < DAY) {
    return i18n.t('time.hoursAgo', { count: Math.floor(elapsed / HOUR) });
  }
  if (elapsed < WEEK) {
    return i18n.t('time.daysAgo', { count: Math.floor(elapsed / DAY) });
  }

  return new Date(then).toLocaleDateString(
    i18n.language === 'tr' ? 'tr-TR' : 'en-GB',
    { day: 'numeric', month: 'short' },
  );
}

export default timeAgo;
