import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  ScryptOptions,
  timingSafeEqual,
} from 'crypto';
import { promisify } from 'util';

import { AccessTokenType, RefreshTokenType } from '../type/auth.types';

const scryptAsync = promisify<string, string, number, ScryptOptions, Buffer>(
  scrypt,
);

const CFG = {
  ACCESS_KEY: 'ACCESS_KEY',
  REFRESH_KEY: 'REFRESH_KEY',
  ACCESS_EXPIRES_IN: 'ACCESS_EXPIRES_IN',
  REFRESH_EXPIRES_IN: 'REFRESH_EXPIRES_IN',
} as const;

const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1 } as const;
const SCRYPT_KEY_LENGTH = 64;

const scryptMaxmem = (params: { N: number; r: number }) =>
  128 * params.N * params.r * 2;

const HASH_SCHEME = 'scrypt';

const MAX_PASSWORD_BYTES = 1024;

const RESET_TOKEN_TTL_MINUTES = 10;

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

    if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
      throw new Error('Invalid password: exceeds maximum length.');
    }

    const salt = randomBytes(16).toString('hex');
    const hash = await this.deriveKey(password, salt, SCRYPT_PARAMS);

    const { N, r, p } = SCRYPT_PARAMS;
    return `${HASH_SCHEME}$N=${N},r=${r},p=${p}$${salt}$${hash.toString('hex')}`;
  }

  async comparePassword(
    storedPassword: string,
    suppliedPassword: string,
  ): Promise<boolean> {
    if (!storedPassword || typeof suppliedPassword !== 'string') return false;

    if (Buffer.byteLength(suppliedPassword, 'utf8') > MAX_PASSWORD_BYTES) {
      return false;
    }

    const parsed = this.parseHash(storedPassword);
    if (!parsed) return false;

    const derived = await this.deriveKey(
      suppliedPassword,
      parsed.salt,
      parsed.params,
      parsed.keyLength,
    );

    return this.constantTimeEquals(derived.toString('hex'), parsed.hash);
  }

  needsRehash(storedPassword: string): boolean {
    const parsed = this.parseHash(storedPassword);
    if (!parsed) return false;

    return (
      parsed.scheme !== HASH_SCHEME ||
      parsed.params.N !== SCRYPT_PARAMS.N ||
      parsed.params.r !== SCRYPT_PARAMS.r ||
      parsed.params.p !== SCRYPT_PARAMS.p
    );
  }

  createPasswordResetToken(): {
    token: string;
    tokenHash: string;
    expiresAt: Date;
  } {
    const token = randomBytes(32).toString('hex');

    return {
      token,
      tokenHash: this.hashToken(token),
      expiresAt: this.addMinutes(RESET_TOKEN_TTL_MINUTES),
    };
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  verifyHashedToken(token: string, hashedToken: string): boolean {
    if (!token || !hashedToken) return false;

    return this.constantTimeEquals(this.hashToken(token), hashedToken);
  }

  async createAccessToken(data: AccessTokenType): Promise<string> {
    return this.jwtService.signAsync(data, {
      secret: this.configService.get(CFG.ACCESS_KEY),
      expiresIn: this.configService.get(CFG.ACCESS_EXPIRES_IN),
    });
  }

  async createRefreshToken(data: RefreshTokenType): Promise<string> {
    return this.jwtService.signAsync(
      { ...data, jti: randomUUID() },
      {
        secret: this.configService.get(CFG.REFRESH_KEY),
        expiresIn: this.configService.get(CFG.REFRESH_EXPIRES_IN),
      },
    );
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

  private async deriveKey(
    password: string,
    salt: string,
    params: { N: number; r: number; p: number },
    keyLength: number = SCRYPT_KEY_LENGTH,
  ): Promise<Buffer> {
    return (await scryptAsync(password, salt, keyLength, {
      ...params,
      maxmem: scryptMaxmem(params),
    })) as Buffer;
  }

  private parseHash(stored: string): {
    scheme: string;
    params: { N: number; r: number; p: number };
    salt: string;
    hash: string;
    keyLength: number;
  } | null {
    if (stored.includes('$')) {
      const [scheme, paramString, salt, hash] = stored.split('$');
      if (scheme !== HASH_SCHEME || !paramString || !salt || !hash) return null;

      const params = { N: 0, r: 0, p: 0 };
      for (const pair of paramString.split(',')) {
        const [key, value] = pair.split('=');
        if (key === 'N' || key === 'r' || key === 'p') {
          params[key] = Number(value);
        }
      }

      if (!params.N || !params.r || !params.p) return null;
      if (params.N > SCRYPT_PARAMS.N * 4 || params.r > 32 || params.p > 16) {
        return null;
      }

      return { scheme, params, salt, hash, keyLength: hash.length / 2 };
    }

    const [hash, salt] = stored.split('.');
    if (!hash || !salt) return null;

    return {
      scheme: 'legacy',
      params: { N: 16384, r: 8, p: 1 },
      salt,
      hash,
      keyLength: SCRYPT_KEY_LENGTH,
    };
  }

  private constantTimeEquals(a: string, b: string): boolean {
    const bufferA = Buffer.from(a, 'hex');
    const bufferB = Buffer.from(b, 'hex');

    if (bufferA.length !== bufferB.length) {
      timingSafeEqual(bufferA, bufferA);
      return false;
    }

    return timingSafeEqual(bufferA, bufferB);
  }

  private addMinutes(minutes: number): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }
}
