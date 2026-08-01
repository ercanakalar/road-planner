const PLACEHOLDER = '—';

export const secondsToHour = (seconds?: number): string => {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) {
    return PLACEHOLDER;
  }
  if (seconds < 60) return '< 1 min';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} h` : `${hours} h ${remainder} min`;
};

export const metersToDistance = (meters?: number): string => {
  if (meters === undefined || meters === null || Number.isNaN(meters)) {
    return PLACEHOLDER;
  }
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
};
