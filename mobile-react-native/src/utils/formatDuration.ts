export const formatWait = (milliseconds: number): string => {
  const totalMinutes = Math.ceil(Math.max(0, milliseconds) / 60_000);

  if (totalMinutes <= 1) return 'less than a minute';
  if (totalMinutes < 60) return `${totalMinutes} minutes`;

  const hours = Math.ceil(totalMinutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;

  const days = Math.ceil(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
};

export const formatCountdown = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};
