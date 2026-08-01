import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { createConfigMock } from 'src/testing/mocks';
import { HelperService } from './helper.service';

const ACCESS_KEY = 'access-secret-at-least-32-chars-long!!';
const REFRESH_KEY = 'refresh-secret-at-least-32-chars-long!';

describe('HelperService', () => {
  let service: HelperService;
  let jwt: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HelperService,
        JwtService,
        {
          provide: ConfigService,
          useValue: createConfigMock({
            ACCESS_KEY,
            REFRESH_KEY,
            ACCESS_EXPIRES_IN: '15m',
            REFRESH_EXPIRES_IN: '7d',
          }),
        },
      ],
    }).compile();

    service = module.get(HelperService);
    jwt = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('toHashPassword', () => {
    it('produces a versioned scheme$params$salt$hash string', async () => {
      const hash = await service.toHashPassword('correct horse battery');

      expect(hash).toMatch(
        /^scrypt\$N=\d+,r=\d+,p=\d+\$[0-9a-f]{32}\$[0-9a-f]{128}$/,
      );
    });

    it('salts each hash so identical passwords differ on disk', async () => {
      const [first, second] = await Promise.all([
        service.toHashPassword('same-password'),
        service.toHashPassword('same-password'),
      ]);

      expect(first).not.toBe(second);
    });

    it('rejects an empty password', async () => {
      await expect(service.toHashPassword('')).rejects.toThrow();
    });
  });

  describe('comparePassword', () => {
    it('accepts the correct password', async () => {
      const stored = await service.toHashPassword('s3cret-password');

      await expect(
        service.comparePassword(stored, 's3cret-password'),
      ).resolves.toBe(true);
    });

    it('rejects an incorrect password', async () => {
      const stored = await service.toHashPassword('s3cret-password');

      await expect(
        service.comparePassword(stored, 'wrong-password'),
      ).resolves.toBe(false);
    });

    it('rejects a stored value with no salt separator', async () => {
      await expect(
        service.comparePassword('not-a-valid-hash', 'anything'),
      ).resolves.toBe(false);
    });

    it('rejects an empty stored value rather than throwing', async () => {
      await expect(service.comparePassword('', 'anything')).resolves.toBe(
        false,
      );
    });
  });

  describe('createAccessToken', () => {
    it('signs with ACCESS_KEY', async () => {
      const token = await service.createAccessToken({
        userId: 'user-1',
        email: 'a@b.com',
      });

      expect(() => jwt.verify(token, { secret: ACCESS_KEY })).not.toThrow();
    });

    it('is not verifiable with REFRESH_KEY', async () => {
      const token = await service.createAccessToken({
        userId: 'user-1',
        email: 'a@b.com',
      });

      expect(() => jwt.verify(token, { secret: REFRESH_KEY })).toThrow();
    });

    it('carries a finite expiry', async () => {
      const token = await service.createAccessToken({
        userId: 'user-1',
        email: 'a@b.com',
      });

      const payload = jwt.verify<{ exp?: number }>(token, {
        secret: ACCESS_KEY,
      });

      expect(payload.exp).toBeDefined();
    });
  });

  describe('createRefreshToken', () => {
    it('signs with REFRESH_KEY', async () => {
      const token = await service.createRefreshToken({
        userId: 'user-1',
        email: 'a@b.com',
      });

      expect(() => jwt.verify(token, { secret: REFRESH_KEY })).not.toThrow();
    });

    it('is not verifiable with ACCESS_KEY', async () => {
      const token = await service.createRefreshToken({
        userId: 'user-1',
        email: 'a@b.com',
      });

      expect(() => jwt.verify(token, { secret: ACCESS_KEY })).toThrow();
    });
  });

  describe('generateTokens', () => {
    it('returns a distinct access and refresh token', async () => {
      const tokens = await service.generateTokens({
        accessTokenData: { userId: 'user-1', email: 'a@b.com' },
        refreshTokenData: { userId: 'user-1', email: 'a@b.com' },
      });

      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });
  });

  describe('verifyAccessToken', () => {
    it('round-trips an access token payload', async () => {
      const token = await service.createAccessToken({
        userId: 'user-1',
        email: 'a@b.com',
      });

      await expect(service.verifyAccessToken(token)).resolves.toMatchObject({
        userId: 'user-1',
        email: 'a@b.com',
      });
    });

    it('rejects a refresh token presented as an access token', async () => {
      const refresh = await service.createRefreshToken({
        userId: 'user-1',
        email: 'a@b.com',
      });

      await expect(service.verifyAccessToken(refresh)).rejects.toThrow();
    });

    it('rejects a tampered token', async () => {
      const token = await service.createAccessToken({
        userId: 'user-1',
        email: 'a@b.com',
      });

      await expect(
        service.verifyAccessToken(`${token}tampered`),
      ).rejects.toThrow();
    });
  });

  describe('createPasswordResetToken', () => {
    it('returns a 64-character hex token', () => {
      const { token } = service.createPasswordResetToken();

      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns a digest that differs from the token', () => {
      const { token, tokenHash } = service.createPasswordResetToken();

      expect(tokenHash).not.toBe(token);
      expect(tokenHash).toBe(service.hashToken(token));
    });

    it('produces a digest that verifies against the raw token', () => {
      const { token, tokenHash } = service.createPasswordResetToken();

      expect(service.verifyHashedToken(token, tokenHash)).toBe(true);
    });

    it('returns a fresh token each call', () => {
      const first = service.createPasswordResetToken().token;
      const second = service.createPasswordResetToken().token;

      expect(first).not.toBe(second);
    });

    it('expires within the next 10 minutes', () => {
      const { expiresAt } = service.createPasswordResetToken();

      const minutesFromNow = (expiresAt.getTime() - Date.now()) / 60_000;

      expect(minutesFromNow).toBeGreaterThan(9);
      expect(minutesFromNow).toBeLessThanOrEqual(10);
    });
  });

  describe('hashToken / verifyHashedToken', () => {
    it('is deterministic for the same input', () => {
      expect(service.hashToken('abc')).toBe(service.hashToken('abc'));
    });

    it('differs for different inputs', () => {
      expect(service.hashToken('abc')).not.toBe(service.hashToken('abd'));
    });

    it('verifies a token against its own hash', () => {
      expect(service.verifyHashedToken('abc', service.hashToken('abc'))).toBe(
        true,
      );
    });

    it('rejects a token against a different hash', () => {
      expect(service.verifyHashedToken('abc', service.hashToken('xyz'))).toBe(
        false,
      );
    });

    it.each([
      ['', 'abc'],
      ['abc', ''],
      ['', ''],
    ])(
      'rejects the empty pair (%p, %p) rather than throwing',
      (token, hash) => {
        expect(service.verifyHashedToken(token, hash)).toBe(false);
      },
    );

    it('rejects a digest of the wrong length rather than throwing', () => {
      expect(service.verifyHashedToken('abc', 'deadbeef')).toBe(false);
    });
  });

  describe('hash format', () => {
    it('encodes the scheme and cost parameters in the hash', async () => {
      const hash = await service.toHashPassword('Str0ng-Password');

      expect(hash).toMatch(
        /^scrypt\$N=\d+,r=\d+,p=\d+\$[0-9a-f]{32}\$[0-9a-f]+$/,
      );
    });

    it('does not report a freshly written hash as needing a rehash', async () => {
      const hash = await service.toHashPassword('Str0ng-Password');

      expect(service.needsRehash(hash)).toBe(false);
    });

    it('reports a legacy hash as needing a rehash', () => {
      expect(service.needsRehash(`${'a'.repeat(128)}.${'b'.repeat(32)}`)).toBe(
        true,
      );
    });

    it('reports a hash written at a lower cost as needing a rehash', () => {
      const lowCost = `scrypt$N=1024,r=8,p=1$${'a'.repeat(32)}$${'b'.repeat(128)}`;

      expect(service.needsRehash(lowCost)).toBe(true);
    });

    it('rejects a stored hash claiming absurd cost parameters', async () => {
      const absurd = `scrypt$N=1073741824,r=64,p=16$${'a'.repeat(32)}$${'b'.repeat(128)}`;

      await expect(service.comparePassword(absurd, 'anything')).resolves.toBe(
        false,
      );
    });

    it.each([
      'scrypt$$salt$hash',
      'scrypt$N=0,r=8,p=1$salt$hash',
      'bcrypt$N=16384,r=8,p=1$salt$hash',
      'nonsense',
      '$$$',
    ])('rejects the malformed stored value %p', async (stored) => {
      await expect(service.comparePassword(stored, 'anything')).resolves.toBe(
        false,
      );
    });
  });

  describe('legacy hash compatibility', () => {
    const legacyHash = async (password: string): Promise<string> => {
      const { scrypt: rawScrypt, randomBytes } = await import('crypto');
      const { promisify } = await import('util');
      const salt = randomBytes(16).toString('hex');
      const derived = (await promisify(rawScrypt)(
        password,
        salt,
        64,
      )) as Buffer;

      return `${derived.toString('hex')}.${salt}`;
    };

    it('verifies a password stored in the legacy format', async () => {
      const stored = await legacyHash('OldPassword1');

      await expect(
        service.comparePassword(stored, 'OldPassword1'),
      ).resolves.toBe(true);
    });

    it('rejects a wrong password against a legacy hash', async () => {
      const stored = await legacyHash('OldPassword1');

      await expect(service.comparePassword(stored, 'WrongOne1')).resolves.toBe(
        false,
      );
    });
  });

  describe('password length ceiling', () => {
    it('refuses to hash a password beyond the ceiling', async () => {
      await expect(service.toHashPassword('a'.repeat(2000))).rejects.toThrow(
        /maximum length/,
      );
    });

    it('refuses to verify an over-long supplied password', async () => {
      const stored = await service.toHashPassword('Str0ng-Password');

      await expect(
        service.comparePassword(stored, 'a'.repeat(2000)),
      ).resolves.toBe(false);
    });
  });
});
