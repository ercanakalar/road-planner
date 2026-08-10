import AsyncStorage from '@react-native-async-storage/async-storage';

import passwordResetLockout, {
  parseAttemptsRemaining,
  parseLockout,
} from './passwordResetLockout';

const inAnHour = () => new Date(Date.now() + 3_600_000).toISOString();

describe('passwordResetLockout', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('reports the time left on a stored lockout', async () => {
    await passwordResetLockout.remember('user@example.com', inAnHour());

    const remaining = await passwordResetLockout.remainingMs(
      'user@example.com',
    );

    expect(remaining).toBeGreaterThan(3_500_000);
    expect(remaining).toBeLessThanOrEqual(3_600_000);
  });

  it('matches addresses case-insensitively', async () => {
    await passwordResetLockout.remember('User@Example.com', inAnHour());

    await expect(
      passwordResetLockout.remainingMs('  user@example.com '),
    ).resolves.toBeGreaterThan(0);
  });

  it('reports nothing for an address that was never locked', async () => {
    await expect(
      passwordResetLockout.remainingMs('nobody@example.com'),
    ).resolves.toBe(0);
  });

  it('prunes an expired lockout instead of reporting a negative wait', async () => {
    await passwordResetLockout.remember(
      'user@example.com',
      new Date(Date.now() - 1_000).toISOString(),
    );

    await expect(
      passwordResetLockout.remainingMs('user@example.com'),
    ).resolves.toBe(0);

    const raw = await AsyncStorage.getItem('password_reset_lockouts_v1');
    expect(raw).not.toContain('user@example.com');
  });

  it('clears a lockout once the code is accepted', async () => {
    await passwordResetLockout.remember('user@example.com', inAnHour());
    await passwordResetLockout.clear('user@example.com');

    await expect(
      passwordResetLockout.remainingMs('user@example.com'),
    ).resolves.toBe(0);
  });

  it('survives corrupt storage', async () => {
    await AsyncStorage.setItem('password_reset_lockouts_v1', 'not json');

    await expect(
      passwordResetLockout.remainingMs('user@example.com'),
    ).resolves.toBe(0);
  });
});

describe('parseLockout', () => {
  it('reads the lockout out of a 423', () => {
    expect(
      parseLockout({
        status: 423,
        data: { lockedUntil: '2026-01-01T00:00:00.000Z', retryAfterSeconds: 60 },
      }),
    ).toEqual({
      lockedUntil: '2026-01-01T00:00:00.000Z',
      retryAfterSeconds: 60,
    });
  });

  it('ignores every other status, so a wrong code is not read as a lockout', () => {
    expect(
      parseLockout({ status: 400, data: { message: 'wrong code' } }),
    ).toBeNull();
    expect(parseLockout({ status: 'FETCH_ERROR' })).toBeNull();
    expect(parseLockout(undefined)).toBeNull();
  });

  it('ignores a 423 with no usable timestamp', () => {
    expect(parseLockout({ status: 423, data: { retryAfterSeconds: 60 } })).toBeNull();
  });
});

describe('parseAttemptsRemaining', () => {
  it('reads the count the API supplies', () => {
    expect(
      parseAttemptsRemaining({ status: 400, data: { attemptsRemaining: 2 } }),
    ).toBe(2);
  });

  it('returns null when the API does not say', () => {
    expect(parseAttemptsRemaining({ status: 400, data: {} })).toBeNull();
    expect(parseAttemptsRemaining(undefined)).toBeNull();
  });
});
