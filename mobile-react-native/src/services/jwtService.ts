import { jwtDecode } from 'jwt-decode';

import { TokenType } from 'types/libs/auth';
import { JwtPayload } from 'types/services/jwt-service-type';

import localStorageService from './localStorageService';

class JwtService {
  async decodeToken<T extends JwtPayload = JwtPayload>(): Promise<T | null> {
    const token = await localStorageService.getItem(TokenType.ACCESS_TOKEN);
    if (!token) return null;
    try {
      return jwtDecode<T>(token);
    } catch {
      return null;
    }
  }

  async isTokenExpired(): Promise<boolean> {
    const token = await localStorageService.getItem(TokenType.REFRESH_TOKEN);
    if (!token) return true;
    const decoded = jwtDecode<JwtPayload>(token);
    if (!decoded || !decoded.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  }

  async getAccessToken(): Promise<string | null> {
    return await localStorageService.getItem(TokenType.ACCESS_TOKEN);
  }
}

export default new JwtService();
