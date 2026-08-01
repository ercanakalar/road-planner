import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { HelperService } from 'src/auth/helper/helper.service';
import { ToastType } from 'src/common/type/status.type';
import { EmailService } from 'src/notification/email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createConfigMock,
  createPrismaMock,
  PrismaMock,
} from 'src/testing/mocks';
import { AuthService } from './auth.service';

type AsMocks<T> = { [K in keyof T]: jest.Mock };

const REFRESH_TOKEN = 'refresh-token';
const REFRESH_TOKEN_HASH = 'hash(refresh-token)';
const SESSION_ID = 'session-1';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaMock;
  let helper: Partial<AsMocks<HelperService>>;
  let email: Partial<AsMocks<EmailService>>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    helper = {
      toHashPassword: jest.fn().mockResolvedValue('scrypt$hashed'),
      comparePassword: jest.fn().mockResolvedValue(true),
      needsRehash: jest.fn().mockReturnValue(false),
      generateTokens: jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: REFRESH_TOKEN,
      }),
      createAccessToken: jest.fn().mockResolvedValue('new-access-token'),
      verifyRefreshToken: jest
        .fn()
        .mockResolvedValue({ userId: 'user-1', email: 'user@example.com' }),

      hashToken: jest.fn((token: string) => `hash(${token})`),
      verifyHashedToken: jest.fn(
        (token: string, hash: string) => `hash(${token})` === hash,
      ),
      createPasswordResetToken: jest.fn().mockReturnValue({
        token: 'raw-reset-token',
        tokenHash: 'hash(raw-reset-token)',
        expiresAt: new Date(Date.now() + 600_000),
      }),
    };

    email = { sendEmail: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: HelperService, useValue: helper },
        { provide: EmailService, useValue: email },
        {
          provide: ConfigService,
          useValue: createConfigMock({
            FRONTEND_URL: 'http://localhost:8081',
            REFRESH_EXPIRES_IN: '7d',
          }),
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  const existingUser = (overrides: Record<string, unknown> = {}) => ({
    id: 'user-1',
    email: 'user@example.com',
    manuelAuth: { id: 'auth-1', password: 'scrypt$stored' },
    googleAuth: null,
    ...overrides,
  });

  const liveSession = (overrides: Record<string, unknown> = {}) => ({
    id: SESSION_ID,
    userId: 'user-1',
    refreshTokenHash: REFRESH_TOKEN_HASH,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 86_400_000),
    user: { id: 'user-1', email: 'user@example.com' },
    ...overrides,
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signUp', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.permit.findUnique.mockResolvedValue({ id: 'permit-1' });
      prisma.user.upsert.mockResolvedValue({
        id: 'new-user',
        email: 'new@example.com',
      });
      prisma.manuelAuth.create.mockResolvedValue({ id: 'auth-new' });
      prisma.session.create.mockResolvedValue({ id: SESSION_ID });
    });

    it('returns the id of the user it created', async () => {
      const result = await service.signUp({
        email: 'new@example.com',
        password: 'Str0ng-Password',
      });

      expect(result.data.userId).toBe('new-user');
    });

    it('never returns a null userId on success', async () => {
      const result = await service.signUp({
        email: 'new@example.com',
        password: 'Str0ng-Password',
      });

      expect(result.data.userId).not.toBeNull();
    });

    it('stores only the digest of the refresh token', async () => {
      await service.signUp({
        email: 'new@example.com',
        password: 'Str0ng-Password',
      });

      const { data } = prisma.session.create.mock.calls[0][0];
      expect(data.refreshTokenHash).toBe(REFRESH_TOKEN_HASH);
      expect(data.refreshTokenHash).not.toBe(REFRESH_TOKEN);
    });

    it('does not persist the access token anywhere', async () => {
      await service.signUp({
        email: 'new@example.com',
        password: 'Str0ng-Password',
      });

      const { data } = prisma.session.create.mock.calls[0][0];
      expect(Object.keys(data)).toEqual(
        expect.not.arrayContaining(['accessToken']),
      );
    });

    it('records an expiry derived from REFRESH_EXPIRES_IN', async () => {
      await service.signUp({
        email: 'new@example.com',
        password: 'Str0ng-Password',
      });

      const { data } = prisma.session.create.mock.calls[0][0];
      const days = (data.expiresAt.getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(6.9);
      expect(days).toBeLessThanOrEqual(7);
    });

    it('returns the raw tokens to the caller', async () => {
      const result = await service.signUp({
        email: 'new@example.com',
        password: 'Str0ng-Password',
      });

      expect(result.data.refreshToken).toBe(REFRESH_TOKEN);
      expect(result.data.accessToken).toBe('access-token');
    });

    it('rejects an address that already has manual credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser());

      await expect(
        service.signUp({ email: 'user@example.com', password: 'Str0ng-Pass1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('fails loudly when the database has not been seeded', async () => {
      prisma.permit.findUnique.mockResolvedValue(null);

      await expect(
        service.signUp({ email: 'new@example.com', password: 'Str0ng-Pass1' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('signIn', () => {
    it('issues a token pair for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser());

      const result = await service.signIn({
        email: 'user@example.com',
        password: 'correct-password',
      });

      expect(result.data).toMatchObject({
        userId: 'user-1',
        accessToken: 'access-token',
        refreshToken: REFRESH_TOKEN,
      });
      expect(result.status).toBe(ToastType.Success);
    });

    it('stores the digest of the refresh token, not the token', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser());

      await service.signIn({ email: 'user@example.com', password: 'pw' });

      expect(prisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          refreshTokenHash: REFRESH_TOKEN_HASH,
        }),
      });
    });

    it('adds a session rather than replacing the existing one', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser());

      await service.signIn({ email: 'user@example.com', password: 'pw' });

      expect(prisma.session.create).toHaveBeenCalledTimes(1);
      expect(prisma.session.updateMany).not.toHaveBeenCalled();
      expect(prisma.session.deleteMany).not.toHaveBeenCalled();
    });

    describe('account enumeration (H4)', () => {
      it('answers 401 for an unknown address', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        await expect(
          service.signIn({ email: 'nobody@example.com', password: 'pw' }),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('answers 401 for a wrong password', async () => {
        prisma.user.findUnique.mockResolvedValue(existingUser());
        helper.comparePassword!.mockResolvedValue(false);

        await expect(
          service.signIn({ email: 'user@example.com', password: 'wrong' }),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('uses the same message for both', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        const unknown = await service
          .signIn({ email: 'nobody@example.com', password: 'pw' })
          .catch((error) => error.message);

        prisma.user.findUnique.mockResolvedValue(existingUser());
        helper.comparePassword!.mockResolvedValue(false);
        const wrongPassword = await service
          .signIn({ email: 'user@example.com', password: 'wrong' })
          .catch((error) => error.message);

        expect(unknown).toBe(wrongPassword);
        expect(unknown).toBe('Invalid email or password');
      });

      it('still performs a password comparison when no account exists', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        await expect(
          service.signIn({ email: 'nobody@example.com', password: 'pw' }),
        ).rejects.toThrow();
        expect(helper.comparePassword).toHaveBeenCalled();
      });

      it('answers 401 for an account with only Google credentials', async () => {
        prisma.user.findUnique.mockResolvedValue(
          existingUser({ manuelAuth: null }),
        );

        await expect(
          service.signIn({ email: 'user@example.com', password: 'pw' }),
        ).rejects.toThrow(UnauthorizedException);
      });
    });

    it('does not issue tokens when the password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser());
      helper.comparePassword!.mockResolvedValue(false);

      await expect(
        service.signIn({ email: 'user@example.com', password: 'wrong' }),
      ).rejects.toThrow();
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    describe('lazy hash upgrade', () => {
      it('re-hashes a legacy password on successful sign-in', async () => {
        prisma.user.findUnique.mockResolvedValue(existingUser());
        helper.needsRehash!.mockReturnValue(true);

        await service.signIn({ email: 'user@example.com', password: 'pw' });

        expect(prisma.manuelAuth.update).toHaveBeenCalledWith({
          where: { id: 'auth-1' },
          data: { password: 'scrypt$hashed' },
        });
      });

      it('does not re-hash a current password', async () => {
        prisma.user.findUnique.mockResolvedValue(existingUser());
        helper.needsRehash!.mockReturnValue(false);

        await service.signIn({ email: 'user@example.com', password: 'pw' });

        expect(prisma.manuelAuth.update).not.toHaveBeenCalled();
      });

      it('does not re-hash after a failed sign-in', async () => {
        prisma.user.findUnique.mockResolvedValue(existingUser());
        helper.needsRehash!.mockReturnValue(true);
        helper.comparePassword!.mockResolvedValue(false);

        await expect(
          service.signIn({ email: 'user@example.com', password: 'wrong' }),
        ).rejects.toThrow();
        expect(prisma.manuelAuth.update).not.toHaveBeenCalled();
      });
    });
  });

  describe('signOut', () => {
    it('revokes every live session for the user', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser());

      await service.signOut('user-1');

      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('does not touch sessions belonging to other users', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser());

      await service.signOut('user-1');

      const { where } = prisma.session.updateMany.mock.calls[0][0];
      expect(where.userId).toBe('user-1');
    });

    it('succeeds when there are no live sessions', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser());
      prisma.session.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.signOut('user-1');

      expect(result.status).toBe(ToastType.Success);
    });

    it('rejects an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.signOut('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects an empty user id', async () => {
      await expect(service.signOut('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshToken', () => {
    it('issues a new pair for a token matching a live session', async () => {
      prisma.session.findUnique.mockResolvedValue(liveSession());

      const result = await service.refreshToken(REFRESH_TOKEN);

      expect(result.data).toMatchObject({
        userId: 'user-1',
        accessToken: 'access-token',
      });
    });

    it('looks the session up by digest, not by user', async () => {
      prisma.session.findUnique.mockResolvedValue(liveSession());

      await service.refreshToken(REFRESH_TOKEN);

      expect(prisma.session.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { refreshTokenHash: REFRESH_TOKEN_HASH },
        }),
      );
    });

    it('replaces the session rather than updating it in place', async () => {
      prisma.session.findUnique.mockResolvedValue(liveSession());
      helper.generateTokens!.mockResolvedValue({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      });

      const result = await service.refreshToken(REFRESH_TOKEN);

      expect(result.data.refreshToken).toBe('refresh-2');
      expect(prisma.session.delete).toHaveBeenCalledWith({
        where: { id: SESSION_ID },
      });
      expect(prisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ refreshTokenHash: 'hash(refresh-2)' }),
      });
    });

    it('leaves the user’s other sessions alone', async () => {
      prisma.session.findUnique.mockResolvedValue(liveSession());

      await service.refreshToken(REFRESH_TOKEN);

      expect(prisma.session.updateMany).not.toHaveBeenCalled();
      expect(prisma.session.deleteMany).not.toHaveBeenCalled();
    });

    describe('validation against storage (C4)', () => {
      it('rejects a signature-valid token with no matching session', async () => {
        prisma.session.findUnique.mockResolvedValue(null);

        await expect(service.refreshToken(REFRESH_TOKEN)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('rejects a refresh against a revoked session', async () => {
        prisma.session.findUnique.mockResolvedValue(
          liveSession({ revokedAt: new Date() }),
        );

        await expect(service.refreshToken(REFRESH_TOKEN)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('rejects a refresh against an expired session', async () => {
        prisma.session.findUnique.mockResolvedValue(
          liveSession({ expiresAt: new Date(Date.now() - 1000) }),
        );

        await expect(service.refreshToken(REFRESH_TOKEN)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('rejects a session whose owner disagrees with the token subject', async () => {
        prisma.session.findUnique.mockResolvedValue(
          liveSession({ userId: 'someone-else' }),
        );

        await expect(service.refreshToken(REFRESH_TOKEN)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('revokes every session when an unknown token is presented', async () => {
        prisma.session.findUnique.mockResolvedValue(null);

        await expect(service.refreshToken(REFRESH_TOKEN)).rejects.toThrow();
        expect(prisma.session.updateMany).toHaveBeenCalledWith({
          where: { userId: 'user-1', revokedAt: null },
          data: { revokedAt: expect.any(Date) },
        });
      });

      it('does not issue a new session on a failed refresh', async () => {
        prisma.session.findUnique.mockResolvedValue(null);

        await expect(service.refreshToken(REFRESH_TOKEN)).rejects.toThrow();
        expect(prisma.session.create).not.toHaveBeenCalled();
      });

      it('rejects a token whose signature does not verify', async () => {
        helper.verifyRefreshToken!.mockRejectedValue(new Error('invalid'));

        await expect(service.refreshToken('garbage')).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('rejects a token with no userId claim', async () => {
        helper.verifyRefreshToken!.mockResolvedValue({
          email: 'user@example.com',
        });

        await expect(service.refreshToken(REFRESH_TOKEN)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('does not disclose why the refresh failed', async () => {
        prisma.session.findUnique.mockResolvedValue(null);

        await expect(service.refreshToken(REFRESH_TOKEN)).rejects.toThrow(
          'Invalid refresh token',
        );
      });
    });
  });

  describe('forgotPassword', () => {
    describe('token disclosure (C1)', () => {
      beforeEach(() => {
        prisma.user.findUnique.mockResolvedValue(existingUser());
      });

      it('does not return the reset token', async () => {
        const result = await service.forgotPassword('user@example.com');

        expect(result).not.toHaveProperty('resetToken');
      });

      it('does not return the reset URL', async () => {
        const result = await service.forgotPassword('user@example.com');

        expect(result).not.toHaveProperty('resetTokenUrl');
      });

      it('returns nothing beyond a generic acknowledgement', async () => {
        const result = await service.forgotPassword('user@example.com');

        expect(Object.keys(result).sort()).toEqual([
          'header',
          'message',
          'status',
        ]);
      });

      it('emails the raw token, not the stored digest', async () => {
        await service.forgotPassword('user@example.com');

        const [payload] = email.sendEmail!.mock.calls[0];
        expect(payload.text).toContain('raw-reset-token');
        expect(payload.text).not.toContain('hash(raw-reset-token)');
      });

      it('stores only the digest', async () => {
        await service.forgotPassword('user@example.com');

        expect(prisma.passwordReset.create).toHaveBeenCalledWith({
          data: {
            userId: 'user-1',
            tokenHash: 'hash(raw-reset-token)',
            expiresAt: expect.any(Date),
          },
        });
      });

      it('supersedes any outstanding request for the same account', async () => {
        await service.forgotPassword('user@example.com');

        expect(prisma.passwordReset.updateMany).toHaveBeenCalledWith({
          where: { userId: 'user-1', usedAt: null },
          data: { usedAt: expect.any(Date) },
        });
      });
    });

    describe('account enumeration (H4)', () => {
      it('answers identically for an unknown address', async () => {
        prisma.user.findUnique.mockResolvedValue(existingUser());
        const known = await service.forgotPassword('user@example.com');

        prisma.user.findUnique.mockResolvedValue(null);
        const unknown = await service.forgotPassword('nobody@example.com');

        expect(unknown).toEqual(known);
      });

      it('does not send an email for an unknown address', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        await service.forgotPassword('nobody@example.com');

        expect(email.sendEmail).not.toHaveBeenCalled();
      });

      it('does not write a reset token for an unknown address', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        await service.forgotPassword('nobody@example.com');

        expect(prisma.passwordReset.create).not.toHaveBeenCalled();
      });

      it('answers the same way for a Google-only account', async () => {
        prisma.user.findUnique.mockResolvedValue(
          existingUser({ manuelAuth: null }),
        );

        await expect(
          service.forgotPassword('user@example.com'),
        ).resolves.toMatchObject({ status: ToastType.Success });
        expect(email.sendEmail).not.toHaveBeenCalled();
      });
    });
  });

  describe('resetPassword', () => {
    const valid = {
      password: 'Str0ng-Password',
      confirmPassword: 'Str0ng-Password',
    };

    beforeEach(() => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        id: 'reset-1',
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 600_000),
        user: { manuelAuth: { id: 'auth-1' } },
      });
      prisma.passwordReset.updateMany.mockResolvedValue({ count: 1 });
    });

    it('sets the new password', async () => {
      await service.resetPassword(valid, 'raw-reset-token');

      expect(prisma.manuelAuth.update).toHaveBeenCalledWith({
        where: { id: 'auth-1' },
        data: { password: 'scrypt$hashed' },
      });
    });

    it('looks the token up by digest, not by raw value', async () => {
      await service.resetPassword(valid, 'raw-reset-token');

      expect(prisma.passwordReset.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tokenHash: 'hash(raw-reset-token)' },
        }),
      );
    });

    it('rejects an expired grant', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        id: 'reset-1',
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        user: { manuelAuth: { id: 'auth-1' } },
      });

      await expect(
        service.resetPassword(valid, 'raw-reset-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a grant that has already been used', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        id: 'reset-1',
        userId: 'user-1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 600_000),
        user: { manuelAuth: { id: 'auth-1' } },
      });

      await expect(
        service.resetPassword(valid, 'raw-reset-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('consumes the grant', async () => {
      await service.resetPassword(valid, 'raw-reset-token');

      const { where, data } = prisma.passwordReset.updateMany.mock.calls[0][0];
      expect(where).toEqual({ id: 'reset-1', usedAt: null });
      expect(data.usedAt).toBeInstanceOf(Date);
    });

    it('revokes every live session for the account', async () => {
      await service.resetPassword(valid, 'raw-reset-token');

      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('treats the token as consumed when the compare-and-swap loses', async () => {
      prisma.passwordReset.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.resetPassword(valid, 'raw-reset-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not set a password when the swap loses', async () => {
      prisma.passwordReset.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.resetPassword(valid, 'raw-reset-token'),
      ).rejects.toThrow();
      expect(prisma.manuelAuth.update).not.toHaveBeenCalled();
    });

    it('rejects an unknown or expired token', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword(valid, 'raw-reset-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a token whose account has no manual credentials', async () => {
      prisma.passwordReset.findUnique.mockResolvedValue({
        id: 'reset-1',
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 600_000),
        user: { manuelAuth: null },
      });

      await expect(
        service.resetPassword(valid, 'raw-reset-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a mismatched confirmation', async () => {
      await expect(
        service.resetPassword(
          { password: 'Str0ng-Password', confirmPassword: 'Different-1' },
          'raw-reset-token',
        ),
      ).rejects.toThrow(/do not match/);
    });

    it('does not touch the database on a mismatched confirmation', async () => {
      await expect(
        service.resetPassword(
          { password: 'Str0ng-Password', confirmPassword: 'Different-1' },
          'raw-reset-token',
        ),
      ).rejects.toThrow();
      expect(prisma.passwordReset.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('signInWithGoogle', () => {
    beforeEach(() => {
      prisma.permit.findUnique.mockResolvedValue({ id: 'permit-1' });
    });

    it('issues this API’s tokens for a new Google user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'g@example.com',
      });
      prisma.session.create.mockResolvedValue({ id: SESSION_ID });
      prisma.googleAuth.create.mockResolvedValue({ id: 'google-1' });

      const result = await service.signInWithGoogle('g@example.com');

      expect(result.data.accessToken).toBe('access-token');
      expect(result.data.refreshToken).toBe(REFRESH_TOKEN);
    });

    it('does not persist Google’s tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'g@example.com',
      });
      prisma.session.create.mockResolvedValue({ id: SESSION_ID });

      await service.signInWithGoogle('g@example.com');

      const { data } = prisma.session.create.mock.calls[0][0];
      expect(data.refreshTokenHash).toBe(REFRESH_TOKEN_HASH);
      expect(Object.keys(data)).toEqual(
        expect.not.arrayContaining(['accessToken']),
      );
    });

    it('links a Google identity to an existing account', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser());
      prisma.session.create.mockResolvedValue({ id: SESSION_ID });

      const result = await service.signInWithGoogle('user@example.com');

      expect(result.data.userId).toBe('user-1');
      expect(prisma.googleAuth.create).toHaveBeenCalled();
    });

    it('reuses an existing Google link', async () => {
      prisma.user.findUnique.mockResolvedValue(
        existingUser({ googleAuth: { id: 'google-1' } }),
      );
      prisma.session.create.mockResolvedValue({ id: SESSION_ID });

      await service.signInWithGoogle('user@example.com');

      expect(prisma.googleAuth.create).not.toHaveBeenCalled();
    });
  });
});
