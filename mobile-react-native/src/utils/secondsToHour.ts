import i18n from 'i18n';

const PLACEHOLDER = '—';

// Turkish writes 1,5 km where English writes 1.5 km.
const decimal = (value: string): string =>
  i18n.language === 'tr' ? value.replace('.', ',') : value;

export const secondsToHour = (seconds?: number): string => {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) {
    return PLACEHOLDER;
  }
  if (seconds < 60) return i18n.t('units.underAMinute');

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return i18n.t('units.minutesShort', { count: minutes });

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder === 0
    ? i18n.t('units.hoursShort', { count: hours })
    : i18n.t('units.hoursMinutesShort', { hours, minutes: remainder });
};

export const metersToDistance = (meters?: number): string => {
  if (meters === undefined || meters === null || Number.isNaN(meters)) {
    return PLACEHOLDER;
  }
  if (meters < 1000) {
    return i18n.t('units.metres', { value: Math.round(meters) });
  }

  return i18n.t('units.kilometres', {
    value: decimal((meters / 1000).toFixed(meters < 10000 ? 1 : 0)),
  });
};
