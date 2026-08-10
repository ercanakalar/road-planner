import { jwtDecode } from 'jwt-decode';

import { JwtPayload } from 'types/services/jwt-service-type';

import tokenStorage from './tokenStorage';

class JwtService {
  async decodeToken<T extends JwtPayload = JwtPayload>(
    token?: string | null,
  ): Promise<T | null> {
    const value = token ?? (await tokenStorage.getAccessToken());
    if (!value) return null;

    try {
      return jwtDecode<T>(value);
    } catch {
      return null;
    }
  }

  async isTokenExpired(): Promise<boolean> {
    const { refreshToken } = await tokenStorage.get();
    if (!refreshToken) return true;

    try {
      const decoded = jwtDecode<JwtPayload>(refreshToken);
      if (!decoded?.exp) return true;
      return decoded.exp < Math.floor(Date.now() / 1000);
    } catch {
      return true;
    }
  }

  async getAccessToken(): Promise<string | null> {
    return tokenStorage.getAccessToken();
  }
}

export default new JwtService();
