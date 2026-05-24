import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { scrypt, randomBytes, createHash } from 'crypto';
import { promisify } from 'util';
import { AccessTokenType, RefreshTokenType } from '../type/auth.types';

const scryptAsync = promisify(scrypt);

const CFG = {
  ACCESS_KEY: 'ACCESS_KEY',
  REFRESH_KEY: 'REFRESH_KEY',
  ACCESS_EXPIRES_IN: 'ACCESS_EXPIRES_IN',
  REFRESH_EXPIRES_IN: 'REFRESH_EXPIRES_IN',
} as const;

@Injectable()
export class HelperService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async toHashPassword(password: string): Promise<string> {
    if (!password || typeof password !== 'string') {
      throw new Error('Invalid password: must be a non-empty string.');
    }

    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;

    return `${buf.toString('hex')}.${salt}`;
  }

  async comparePassword(
    storedPassword: string,
    suppliedPassword: string,
  ): Promise<boolean> {
    const [hash, salt] = storedPassword.split('.');

    if (!hash || !salt) return false;

    const buf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;

    return buf.toString('hex') === hash;
  }

  createPasswordResetToken(): {
    resetToken: string;
    passwordResetTokenExpiry: Date;
  } {
    const rawToken = randomBytes(32).toString('hex');
    const resetToken = createHash('sha256').update(rawToken).digest('hex');

    return {
      resetToken,
      passwordResetTokenExpiry: this.addMinutes(10),
    };
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  verifyHashedToken(token: string, hashedToken: string): boolean {
    return this.hashToken(token) === hashedToken;
  }

  async createAccessToken(data: AccessTokenType): Promise<string> {
    return this.jwtService.signAsync(data, {
      secret: this.configService.get(CFG.ACCESS_KEY),
      expiresIn: this.configService.get(CFG.ACCESS_EXPIRES_IN),
    });
  }

  async createRefreshToken(data: RefreshTokenType): Promise<string> {
    return this.jwtService.signAsync(data, {
      secret: this.configService.get(CFG.REFRESH_KEY),
      expiresIn: this.configService.get(CFG.REFRESH_EXPIRES_IN),
    });
  }

  async generateTokens(payload: {
    accessTokenData: AccessTokenType;
    refreshTokenData: RefreshTokenType;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.createAccessToken(payload.accessTokenData),
      this.createRefreshToken(payload.refreshTokenData),
    ]);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string) {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get(CFG.ACCESS_KEY),
    });
  }

  async verifyRefreshToken(token: string) {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get(CFG.REFRESH_KEY),
    });
  }

  passwordChangedAfterToken(
    jwtIssuedAt: number,
    passwordChangedAt: number,
  ): boolean {
    return passwordChangedAt > jwtIssuedAt;
  }

  private addMinutes(minutes: number): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }
}
