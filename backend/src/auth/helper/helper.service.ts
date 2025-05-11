import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { scrypt, randomBytes, createHash } from 'crypto';
import { promisify } from 'util';

import { AccessTokenType, RefreshTokenType } from '../type/auth.types';

const scryptAsync = promisify(scrypt);

@Injectable()
export class HelperService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async comparePassword(
    storedPassword: string,
    suppliedPassword: string,
  ): Promise<boolean> {
    const [hashedPassword, salt] = storedPassword.split('.');
    const buf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;

    return buf.toString('hex') === hashedPassword;
  }

  async verifyAccessToken(token: string) {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get('ACCESS_KEY'),
    });
  }

  async verifyRefreshToken(token: string) {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get('REFRESH_KEY'),
    });
  }

  changedPasswordAfter(JWTTimestamp: number, passwordChangedAt: number) {
    if (passwordChangedAt > JWTTimestamp) {
      return true;
    }
    return false;
  }

  async hashPasswordToken(token: string) {
    const hash = createHash('sha256');
    hash.update(token);
    const hashedToken = hash.digest('hex');

    return hashedToken;
  }

  async verifyPasswordResetToken(
    token: string,
    hashedPasswordResetToken: string,
  ) {
    const hash = createHash('sha256');
    hash.update(token);
    const hashedToken = hash.digest('hex');

    return hashedToken === hashedPasswordResetToken;
  }

  async toHashPassword(password: string) {
    if (!password || typeof password !== 'string') {
      throw new Error('Invalid password: Password must be a non-empty string.');
    }

    const salt = randomBytes(10).toString('hex');
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    const hashedPassword = buf.toString('hex');

    return `${hashedPassword}.${salt}`;
  }

  async createPasswordResetToken(email: string) {
    const salt = randomBytes(10).toString('hex');
    const buf = (await scryptAsync(email, salt, 64)) as Buffer;
    const hashedPassword = buf.toString('hex');
    const passwordResetToken = `${hashedPassword}.${salt}`;

    const hash = createHash('sha256');
    hash.update(passwordResetToken);
    const hashedResetToken = hash.digest('hex');

    const expiryDate = this.newDate(10);

    return {
      resetToken: hashedResetToken,
      passwordResetTokenExpiry: expiryDate,
    };
  }

  newDate(min: number): Date {
    const currentDate = new Date();
    const futureDate = new Date(currentDate.getTime());
    futureDate.setMinutes(futureDate.getMinutes() + min);
    return futureDate;
  }

  async createAccessToken(data: AccessTokenType) {
    return this.jwtService.signAsync(
      {
        ...data,
      },
      {
        secret: this.configService.get('ACCESS_KEY'),
        expiresIn: this.configService.get('ACCESS_EXPIRES_IN'),
      },
    );
  }

  async createRefreshToken(data: RefreshTokenType) {
    return this.jwtService.signAsync(
      {
        ...data,
      },
      {
        secret: this.configService.get('REFRESH_KEY'),
        expiresIn: this.configService.get('REFRESH_EXPIRES_IN'),
      },
    );
  }

  public async generateTokens(payload: {
    accessTokenData: AccessTokenType;
    refreshTokenData: RefreshTokenType;
  }) {
    const { accessTokenData, refreshTokenData } = payload;
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          ...accessTokenData,
        },
        {
          secret: this.configService.get('ACCESS_KEY'),
          expiresIn: this.configService.get('ACCESS_EXPIRES_IN'),
        },
      ),
      this.jwtService.signAsync(
        {
          ...refreshTokenData,
        },
        {
          secret: this.configService.get('REFRESH_KEY'),
          expiresIn: this.configService.get('REFRESH_EXPIRES_IN'),
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }
}
