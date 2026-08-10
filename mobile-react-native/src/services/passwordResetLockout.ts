import localStorageService from './localStorageService';
import { PasswordResetLockout } from 'types/store/services/authenticationService-type';

const STORAGE_KEY = 'password_reset_lockouts_v1';

type LockoutMap = Record<string, string>;

const normalize = (email: string) => email.trim().toLowerCase();

const read = async (): Promise<LockoutMap> => {
  try {
    const raw = await localStorageService.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as LockoutMap)
      : {};
  } catch {
    return {};
  }
};

const write = async (map: LockoutMap) => {
  try {
    await localStorageService.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
  }
};

export const passwordResetLockout = {
  async remember(email: string, lockedUntil: string): Promise<void> {
    const map = await read();
    map[normalize(email)] = lockedUntil;
    await write(map);
  },

  async remainingMs(email: string): Promise<number> {
    const map = await read();
    const stored = map[normalize(email)];
    if (!stored) return 0;

    const remaining = new Date(stored).getTime() - Date.now();
    if (Number.isNaN(remaining) || remaining <= 0) {
      delete map[normalize(email)];
      await write(map);
      return 0;
    }
    return remaining;
  },

  async clear(email: string): Promise<void> {
    const map = await read();
    delete map[normalize(email)];
    await write(map);
  },
};

export const parseLockout = (error: unknown): PasswordResetLockout | null => {
  const data = (error as { data?: Record<string, unknown> } | undefined)?.data;
  const status = (error as { status?: number } | undefined)?.status;

  if (status !== 423 || !data) return null;

  const lockedUntil = data.lockedUntil;
  const retryAfterSeconds = data.retryAfterSeconds;

  if (typeof lockedUntil !== 'string') return null;

  return {
    lockedUntil,
    retryAfterSeconds:
      typeof retryAfterSeconds === 'number' ? retryAfterSeconds : 0,
  };
};

export const parseAttemptsRemaining = (error: unknown): number | null => {
  const data = (error as { data?: Record<string, unknown> } | undefined)?.data;
  const remaining = data?.attemptsRemaining;
  return typeof remaining === 'number' ? remaining : null;
};

export default passwordResetLockout;
