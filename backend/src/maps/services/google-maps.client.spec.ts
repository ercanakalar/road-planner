import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EnvironmentVariables } from 'src/config/env.validation';
import { createConfigMock } from 'src/testing/mocks';
import { GoogleMapsClient } from './google-maps.client';

const API_KEY = 'server-side-key';

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
});

describe('GoogleMapsClient', () => {
  let fetchMock: jest.SpyInstance;

  const clientWith = (key?: string) =>
    new GoogleMapsClient(
      createConfigMock({
        MAP_API_KEY: key,
      }) as unknown as ConfigService<EnvironmentVariables, true>,
    );

  const client = () => clientWith(API_KEY);

  const requestedUrl = () => new URL(String(fetchMock.mock.calls[0][0]));

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  describe('configuration', () => {
    it('is unconfigured without a key', () => {
      expect(clientWith(undefined).isConfigured()).toBe(false);
      expect(clientWith('').isConfigured()).toBe(false);
    });

    it('answers 503 rather than calling Google without a key', async () => {
      await expect(
        clientWith(undefined).get('/geocode/json', {}),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('requests', () => {
    it('adds the key the caller never sees', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'OK' }));

      await client().get('/geocode/json', { latlng: '1,2' });

      const url = requestedUrl();
      expect(url.origin + url.pathname).toBe(
        'https://maps.googleapis.com/maps/api/geocode/json',
      );
      expect(url.searchParams.get('key')).toBe(API_KEY);
      expect(url.searchParams.get('latlng')).toBe('1,2');
    });

    it('gives up rather than hanging when Google does not answer', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'OK' }));

      await client().get('/geocode/json', {});

      expect(fetchMock.mock.calls[0][1]).toMatchObject({
        signal: expect.any(AbortSignal),
      });
    });

    it('returns the parsed body on OK', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ status: 'OK', results: [{ id: 1 }] }),
      );

      await expect(client().get('/geocode/json', {})).resolves.toEqual({
        status: 'OK',
        results: [{ id: 1 }],
      });
    });

    it('treats ZERO_RESULTS as an answer, not a fault', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'ZERO_RESULTS' }));

      await expect(client().get('/geocode/json', {})).resolves.toEqual({
        status: 'ZERO_RESULTS',
      });
    });
  });

  describe('failures', () => {
    it('answers 503 when the network call throws', async () => {
      fetchMock.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(client().get('/geocode/json', {})).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('answers 502 on a non-2xx response', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 500));

      await expect(client().get('/geocode/json', {})).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('answers 502 when the body is not JSON', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token <')),
      });

      await expect(client().get('/geocode/json', {})).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('answers 503 on a quota status, which a retry may clear', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'OVER_QUERY_LIMIT' }));

      await expect(client().get('/geocode/json', {})).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it.each(['REQUEST_DENIED', 'INVALID_REQUEST', 'NOT_FOUND'])(
      'answers 502 on %s',
      async (status) => {
        fetchMock.mockResolvedValue(jsonResponse({ status }));

        await expect(client().get('/geocode/json', {})).rejects.toThrow(
          BadGatewayException,
        );
      },
    );

    it("never repeats Google's error message to the caller", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          status: 'REQUEST_DENIED',
          error_message: `The provided API key ${API_KEY} is expired`,
        }),
      );

      await expect(client().get('/geocode/json', {})).rejects.toThrow(
        /^Map service returned an error$/,
      );
    });
  });
});
