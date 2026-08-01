import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { OAuth2Client } from 'google-auth-library';

import { createConfigMock } from 'src/testing/mocks';
import { GoogleService } from './google.service';

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

    it('returns nothing but the email', async () => {
      stubGoogle({ email: 'user@example.com', verified_email: true });

      const result = await service.getAuthClientData('code');

      expect(Object.keys(result)).toEqual(['email']);
    });
  });
});
