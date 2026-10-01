import i18n from 'i18n';

export const formatWait = (milliseconds: number): string => {
  const totalMinutes = Math.ceil(Math.max(0, milliseconds) / 60_000);

  if (totalMinutes <= 1) return i18n.t('units.waitUnderAMinute');
  if (totalMinutes < 60) {
    return i18n.t('units.waitMinutes', { count: totalMinutes });
  }

  const hours = Math.ceil(totalMinutes / 60);
  if (hours < 24) return i18n.t('units.waitHours', { count: hours });

  const days = Math.ceil(hours / 24);
  return i18n.t('units.waitDays', { count: days });
};

export const formatCountdown = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};
