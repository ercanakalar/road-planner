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

const idTokenWithAudience = (aud: string): string =>
  `header.${Buffer.from(JSON.stringify({ aud })).toString('base64url')}.signature`;

const googleConfig = {
  GOOGLE_CLIENT_ID: 'client-id',
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

    it('rejects a token that does not say the email is verified', async () => {
      const native = await withNative();
      verifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'a@b.c' }),
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
