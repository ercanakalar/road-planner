import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { OAuth2Client } from 'google-auth-library';

import { createConfigMock } from 'src/testing/mocks';
import { GoogleService, isUsablePhoto, splitName } from './google.service';

/**
 * A token shaped like a JWT but signed by nobody: verification is stubbed in
 * these tests, and the payload exists only so the audience can be read back
 * out of it for the log.
 */
const idTokenWithAudience = (aud: string): string =>
  `header.${Buffer.from(JSON.stringify({ aud })).toString('base64url')}.signature`;

const googleConfig = {
  ACCESS_KEY: 'access-secret-at-least-32-chars-long!!',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  GOOGLE_REDIRECT_URL: 'http://localhost:3000/api/auth/google/callback',
  GOOGLE_SCOPES_API:
    'https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/userinfo.profile',
};

describe('GoogleService', () => {
  let service: GoogleService;

  const build = async (overrides: Record<string, unknown> = {}) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleService,
        {
          provide: ConfigService,
          useValue: createConfigMock({ ...googleConfig, ...overrides }),
        },
      ],
    }).compile();

    return module.get(GoogleService);
  };

  beforeEach(async () => {
    service = await build();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('builds an OAuth client from configuration', () => {
    const client = service.getAuthClient();

    expect(client).toBeInstanceOf(OAuth2Client);
    expect(client._clientId).toBe('client-id');
  });

  describe('configuration', () => {
    it('reports itself configured when all four values are present', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it.each([
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_REDIRECT_URL',
      'GOOGLE_SCOPES_API',
    ])('reports itself unconfigured without %s', async (key) => {
      const partial = await build({ [key]: undefined });

      expect(partial.isConfigured()).toBe(false);
    });

    it('answers 503 rather than crashing when unconfigured', async () => {
      const partial = await build({ GOOGLE_SCOPES_API: undefined });

      await expect(partial.getAuthClientUrl()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('getAuthClientUrl', () => {
    it('points at Google’s consent screen', async () => {
      const { url } = await service.getAuthClientUrl();

      expect(url).toContain('accounts.google.com');
    });

    it('includes the configured client id and redirect', async () => {
      const { url } = await service.getAuthClientUrl();
      const parsed = new URL(url);

      expect(parsed.searchParams.get('client_id')).toBe('client-id');
      expect(parsed.searchParams.get('redirect_uri')).toBe(
        googleConfig.GOOGLE_REDIRECT_URL,
      );
    });

    it('requests offline access so a refresh token is issued', async () => {
      const { url } = await service.getAuthClientUrl();

      expect(new URL(url).searchParams.get('access_type')).toBe('offline');
    });

    it('honours GOOGLE_OAUTH2_ACCESS_TYPE when set', async () => {
      const configured = await build({ GOOGLE_OAUTH2_ACCESS_TYPE: 'online' });

      const { url } = await configured.getAuthClientUrl();

      expect(new URL(url).searchParams.get('access_type')).toBe('online');
    });

    it('splits GOOGLE_SCOPES_API into individual scopes', async () => {
      const { url } = await service.getAuthClientUrl();

      expect(new URL(url).searchParams.get('scope')).toBe(
        'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      );
    });

    it('tolerates whitespace around scopes', async () => {
      const configured = await build({
        GOOGLE_SCOPES_API: ' openid , email , ',
      });

      const { url } = await configured.getAuthClientUrl();

      expect(new URL(url).searchParams.get('scope')).toBe('openid email');
    });

    it('includes a state parameter', async () => {
      const { url, state } = await service.getAuthClientUrl();

      expect(state).toBeTruthy();
      expect(new URL(url).searchParams.get('state')).toBe(state);
    });

    it('issues a different state each time', async () => {
      const first = await service.getAuthClientUrl();
      const second = await service.getAuthClientUrl();

      expect(first.state).not.toBe(second.state);
    });
  });

  describe('state verification', () => {
    it('accepts a state it issued', () => {
      expect(() => service.verifyState(service.createState())).not.toThrow();
    });

    it('rejects a missing state', () => {
      expect(() => service.verifyState(undefined)).toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an empty state', () => {
      expect(() => service.verifyState('')).toThrow(UnauthorizedException);
    });

    it.each(['nonce', 'nonce.123', 'a.b.c.d'])(
      'rejects the malformed state %p',
      (state) => {
        expect(() => service.verifyState(state)).toThrow(UnauthorizedException);
      },
    );

    it('rejects a state with a tampered nonce', () => {
      const [, issuedAt, signature] = service.createState().split('.');

      expect(() =>
        service.verifyState(`attackernonce.${issuedAt}.${signature}`),
      ).toThrow(UnauthorizedException);
    });

    it('rejects a state with a tampered timestamp', () => {
      const [nonce, issuedAt, signature] = service.createState().split('.');
      const forged = `${nonce}.${Number(issuedAt) + 60_000}.${signature}`;

      expect(() => service.verifyState(forged)).toThrow(UnauthorizedException);
    });

    it('rejects a state signed with a different secret', async () => {
      const other = await build({
        ACCESS_KEY: 'a-completely-different-secret-32-chars',
      });

      expect(() => service.verifyState(other.createState())).toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a state older than its ten-minute window', () => {
      jest.useFakeTimers();
      try {
        const state = service.createState();
        jest.advanceTimersByTime(11 * 60 * 1000);

        expect(() => service.verifyState(state)).toThrow(UnauthorizedException);
      } finally {
        jest.useRealTimers();
      }
    });

    it('accepts a state still inside its window', () => {
      jest.useFakeTimers();
      try {
        const state = service.createState();
        jest.advanceTimersByTime(9 * 60 * 1000);

        expect(() => service.verifyState(state)).not.toThrow();
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('getAuthClientData', () => {
    const stubGoogle = (userInfo: Record<string, unknown>) => {
      jest.spyOn(service, 'getAuthClient').mockReturnValue({
        getToken: jest.fn().mockResolvedValue({
          tokens: { access_token: 'google-access' },
        }),
        setCredentials: jest.fn(),
        request: jest.fn().mockResolvedValue({ data: userInfo }),
      } as never);
    };

    it('returns the email for a verified account', async () => {
      stubGoogle({ email: 'user@example.com', verified_email: true });

      await expect(service.getAuthClientData('code')).resolves.toEqual({
        email: 'user@example.com',
      });
    });

    it('returns the name and avatar alongside the email', async () => {
      stubGoogle({
        id: '11223344',
        email: 'user@example.com',
        verified_email: true,
        given_name: 'Ada',
        family_name: 'Lovelace',
        picture: 'https://lh3.googleusercontent.com/a/photo.jpg',
      });

      await expect(service.getAuthClientData('code')).resolves.toEqual({
        email: 'user@example.com',
        googleId: '11223344',
        firstName: 'Ada',
        lastName: 'Lovelace',
        photo: 'https://lh3.googleusercontent.com/a/photo.jpg',
      });
    });

    it('accepts the string "true" as verified', async () => {
      stubGoogle({ email: 'user@example.com', verified_email: 'true' });

      await expect(service.getAuthClientData('code')).resolves.toEqual({
        email: 'user@example.com',
      });
    });

    it('accepts the OpenID spelling email_verified', async () => {
      stubGoogle({ email: 'user@example.com', email_verified: true });

      await expect(service.getAuthClientData('code')).resolves.toEqual({
        email: 'user@example.com',
      });
    });

    it('rejects an unverified address', async () => {
      stubGoogle({ email: 'victim@example.com', verified_email: false });

      await expect(service.getAuthClientData('code')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an address with no verification flag at all', async () => {
      stubGoogle({ email: 'victim@example.com' });

      await expect(service.getAuthClientData('code')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a response with no email', async () => {
      stubGoogle({ verified_email: true });

      await expect(service.getAuthClientData('code')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a missing authorization code', async () => {
      await expect(service.getAuthClientData('')).rejects.toThrow();
    });

    it('returns nothing but the email when Google sent nothing else', async () => {
      stubGoogle({ email: 'user@example.com', verified_email: true });

      const result = await service.getAuthClientData('code');

      expect(Object.keys(result)).toEqual(['email']);
    });
  });

  describe('getProfileFromIdToken', () => {
    const verifyIdToken = jest.fn();

    beforeEach(() => {
      verifyIdToken.mockReset();
      jest
        .spyOn(OAuth2Client.prototype, 'verifyIdToken')
        .mockImplementation(verifyIdToken);
    });

    afterEach(() => jest.restoreAllMocks());

    const withNative = () =>
      build({
        GOOGLE_CLIENT_ID: undefined,
        GOOGLE_NATIVE_CLIENT_IDS: 'ios-id.apps, android-id.apps',
      });

    it('is unavailable until a client id is configured', async () => {
      const bare = await build({
        GOOGLE_CLIENT_ID: undefined,
        GOOGLE_NATIVE_CLIENT_IDS: '',
      });

      expect(bare.isNativeConfigured()).toBe(false);
      await expect(bare.getProfileFromIdToken('t')).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(verifyIdToken).not.toHaveBeenCalled();
    });

    it('pins the audience to the configured client ids', async () => {
      const native = await withNative();
      verifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'a@b.c', email_verified: true }),
      });

      await native.getProfileFromIdToken('token-1');

      expect(verifyIdToken).toHaveBeenCalledWith({
        idToken: 'token-1',
        audience: ['ios-id.apps', 'android-id.apps'],
      });
    });

    it('also accepts a token addressed to the web client of the same project', async () => {
      verifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'a@b.c', email_verified: true }),
      });

      const both = await build({
        GOOGLE_NATIVE_CLIENT_IDS: 'android-id.apps',
      });

      await both.getProfileFromIdToken('token-1');

      expect(verifyIdToken).toHaveBeenCalledWith({
        idToken: 'token-1',
        audience: ['android-id.apps', 'client-id'],
      });
    });

    it('lists a client id only once', async () => {
      const duplicated = await build({
        GOOGLE_NATIVE_CLIENT_IDS: 'client-id, android-id.apps',
      });

      expect(duplicated.acceptedAudiences()).toEqual([
        'client-id',
        'android-id.apps',
      ]);
    });

    it('is available on the web client id alone', async () => {
      const webOnly = await build({ GOOGLE_NATIVE_CLIENT_IDS: '' });

      expect(webOnly.isNativeConfigured()).toBe(true);
    });

    it('returns the verified email', async () => {
      const native = await withNative();
      verifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'a@b.c', email_verified: true }),
      });

      await expect(native.getProfileFromIdToken('t')).resolves.toEqual({
        email: 'a@b.c',
      });
    });

    it('returns the name and avatar carried by the token', async () => {
      const native = await withNative();
      verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: '11223344',
          email: 'a@b.c',
          email_verified: true,
          given_name: 'Ada',
          family_name: 'Lovelace',
          picture: 'https://lh3.googleusercontent.com/a/photo.jpg',
        }),
      });

      await expect(native.getProfileFromIdToken('t')).resolves.toEqual({
        email: 'a@b.c',
        googleId: '11223344',
        firstName: 'Ada',
        lastName: 'Lovelace',
        photo: 'https://lh3.googleusercontent.com/a/photo.jpg',
      });
    });

    it('rejects a token Google will not verify', async () => {
      const native = await withNative();
      verifyIdToken.mockRejectedValue(new Error('bad signature'));

      await expect(native.getProfileFromIdToken('t')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('names the offending audience in the log so it can be fixed', async () => {
      const native = await withNative();
      verifyIdToken.mockRejectedValue(new Error('Wrong recipient'));
      const warn = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);

      await expect(
        native.getProfileFromIdToken(idTokenWithAudience('web-id.apps')),
      ).rejects.toThrow(UnauthorizedException);

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('addressed to web-id.apps'),
      );
    });

    it('says nothing about the audience when it was accepted', async () => {
      const native = await withNative();
      verifyIdToken.mockRejectedValue(new Error('Token used too late'));
      const warn = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);

      await expect(
        native.getProfileFromIdToken(idTokenWithAudience('ios-id.apps')),
      ).rejects.toThrow(UnauthorizedException);

      expect(warn).toHaveBeenCalledWith(
        expect.not.stringContaining('addressed to'),
      );
    });

    it('survives a token it cannot even split apart', async () => {
      const native = await withNative();
      verifyIdToken.mockRejectedValue(new Error('bad signature'));
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      await expect(native.getProfileFromIdToken('not-a-jwt')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an unverified email rather than trusting it', async () => {
      const native = await withNative();
      verifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'a@b.c', email_verified: false }),
      });

      await expect(native.getProfileFromIdToken('t')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a payload with no email at all', async () => {
      const native = await withNative();
      verifyIdToken.mockResolvedValue({ getPayload: () => ({}) });

      await expect(native.getProfileFromIdToken('t')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an empty token before calling Google', async () => {
      const native = await withNative();

      await expect(native.getProfileFromIdToken('')).rejects.toThrow(
        BadRequestException,
      );
      expect(verifyIdToken).not.toHaveBeenCalled();
    });
  });

  describe('splitName', () => {
    it('prefers the structured name Google returns', () => {
      expect(
        splitName({ given_name: 'Ada', family_name: 'Lovelace', name: 'x y' }),
      ).toEqual({ firstName: 'Ada', lastName: 'Lovelace' });
    });

    it('takes a given name without a family name', () => {
      expect(splitName({ given_name: 'Ada' })).toEqual({ firstName: 'Ada' });
    });

    it('splits a single display name on the first space', () => {
      expect(splitName({ name: 'Ada Lovelace' })).toEqual({
        firstName: 'Ada',
        lastName: 'Lovelace',
      });
    });

    it('keeps every remaining part as the last name', () => {
      expect(splitName({ name: 'Ada  King Lovelace' })).toEqual({
        firstName: 'Ada',
        lastName: 'King Lovelace',
      });
    });

    it('accepts a mononym', () => {
      expect(splitName({ name: 'Prince' })).toEqual({ firstName: 'Prince' });
    });

    it('reports no name rather than an empty one', () => {
      expect(splitName({})).toEqual({});
      expect(splitName({ name: '   ' })).toEqual({});
      expect(splitName({ given_name: ' ', family_name: '' })).toEqual({});
    });
  });

  describe('isUsablePhoto', () => {
    it('accepts the https url Google returns', () => {
      expect(isUsablePhoto('https://lh3.googleusercontent.com/a/p.jpg')).toBe(
        true,
      );
    });

    it.each(['http://insecure.example/p.jpg', 'javascript:alert(1)', '', '  '])(
      'refuses %p',
      (photo) => {
        expect(isUsablePhoto(photo)).toBe(false);
      },
    );

    it('refuses a missing photo', () => {
      expect(isUsablePhoto(undefined)).toBe(false);
    });
  });
});
