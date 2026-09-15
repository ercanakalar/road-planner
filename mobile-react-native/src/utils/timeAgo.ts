const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * How long ago something happened, in the shortest true form.
 *
 * A notification list is read by scanning down it, so the age wants to be a
 * couple of characters rather than a date — the date is what you fall back to
 * once "how long ago" has stopped meaning anything, which is about a week.
 *
 * A timestamp slightly in the future reads as "now" rather than as a negative
 * age: phone clocks and server clocks disagree by a few seconds all the time,
 * and "in -3 minutes" is never the right answer.
 */
export function timeAgo(
  iso: string | number | Date,
  now: number = Date.now(),
): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const elapsed = now - then;

  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  if (elapsed < WEEK) return `${Math.floor(elapsed / DAY)}d ago`;

  return new Date(then).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

export default timeAgo;
