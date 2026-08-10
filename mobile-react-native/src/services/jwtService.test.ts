import * as SecureStore from 'expo-secure-store';

import jwtService from './jwtService';
import localStorageService from './localStorageService';
import { TokenType } from 'types/libs/auth';

const tokenFor = (payload: Record<string, unknown>) =>
  `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  )}.signature`;

const getItemAsync = SecureStore.getItemAsync as jest.Mock;

describe('jwtService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getItemAsync.mockResolvedValue(null);
  });

  it('decodes the access token from secure storage, not AsyncStorage', async () => {
    const spy = jest.spyOn(localStorageService, 'getItem');
    getItemAsync.mockImplementation(async (key: string) =>
      key === TokenType.ACCESS_TOKEN
        ? tokenFor({ userId: 'user-1', email: 'a@b.c' })
        : null,
    );

    const decoded = await jwtService.decodeToken();

    expect(decoded?.userId).toBe('user-1');
    expect(spy).not.toHaveBeenCalled();
  });

  it('prefers a token handed to it over reading storage at all', async () => {
    const decoded = await jwtService.decodeToken(
      tokenFor({ userId: 'user-2', email: 'c@d.e' }),
    );

    expect(decoded?.userId).toBe('user-2');
    expect(getItemAsync).not.toHaveBeenCalled();
  });

  it('returns null when there is no token', async () => {
    await expect(jwtService.decodeToken()).resolves.toBeNull();
  });

  it('returns null for a token it cannot decode', async () => {
    await expect(jwtService.decodeToken('not-a-jwt')).resolves.toBeNull();
  });

  it('treats a missing or undecodable refresh token as expired', async () => {
    await expect(jwtService.isTokenExpired()).resolves.toBe(true);

    getItemAsync.mockResolvedValue('not-a-jwt');
    await expect(jwtService.isTokenExpired()).resolves.toBe(true);
  });

  it('reads expiry from the refresh token', async () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    getItemAsync.mockResolvedValue(tokenFor({ userId: 'u', exp: future }));
    await expect(jwtService.isTokenExpired()).resolves.toBe(false);

    const past = Math.floor(Date.now() / 1000) - 3600;
    getItemAsync.mockResolvedValue(tokenFor({ userId: 'u', exp: past }));
    await expect(jwtService.isTokenExpired()).resolves.toBe(true);
  });
});
