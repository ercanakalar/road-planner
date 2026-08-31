export type ICountdown = {
  remainingDuration: number;
  remainingTime: string;
  start: () => void;
  pause: () => void;
  reset: () => void;
  ended?: boolean;
};
export type CountdownProps = {
  format?: 'mm:ss' | 'hh:mm:ss';
  seconds: number;
  autoStart?: boolean;
  onEnd?: () => void;
};
