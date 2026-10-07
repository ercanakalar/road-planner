import i18n from 'i18n';

import baseQuery from './baseQuery';
import tokenStorage from 'services/tokenStorage';
import { sessionCleared, sessionRefreshed } from 'store/actions/sessionActions';

const envelope = (data: unknown) =>
  JSON.stringify({ status: 'success', header: '', message: '', data });

const jsonResponse = (status: number, body: string) =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const runQuery = (url: string, method = 'GET') => {
  const api = {
    signal: new AbortController().signal,
    dispatch: jest.fn(),
    getState: () => ({ auth: { accessToken: 'access-1' } }),
    abort: jest.fn(),
    extra: undefined,
    endpoint: 'test',
    type: 'query' as const,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = baseQuery()({ url, method }, api as any, {});
  return { result, api };
};

const requestedUrls = () =>
  (global.fetch as jest.Mock).mock.calls.map((call) =>
    typeof call[0] === 'string' ? call[0] : call[0].url,
  );

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
  jest
    .spyOn(tokenStorage, 'get')
    .mockResolvedValue({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  jest.spyOn(tokenStorage, 'getAccessToken').mockResolvedValue('access-1');
  jest.spyOn(tokenStorage, 'save').mockResolvedValue(undefined);
  jest.spyOn(tokenStorage, 'clear').mockResolvedValue(undefined);
});

describe('authorization', () => {
  it('attaches the session token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(200, envelope({ ok: true })),
    );

    await runQuery('/road/own-roads').result;

    const request = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(request.headers.get('Authorization')).toBe('Bearer access-1');
  });
});

describe('language', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('asks for the answer in the language on screen', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(200, envelope({ ok: true })),
    );
    await i18n.changeLanguage('tr');

    await runQuery('/road/discover').result;

    const request = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(request.headers.get('Accept-Language')).toBe('tr');
  });

  it('sends it on requests that show no message of their own', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(200, envelope({ ok: true })),
    );

    await runQuery('/user/search').result;

    const request = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(request.headers.get('Accept-Language')).toBe('en');
  });
});

describe('content type', () => {
  const runWith = (headers?: Record<string, string>) => {
    const api = {
      signal: new AbortController().signal,
      abort: jest.fn(),
      dispatch: jest.fn(),
      getState: () => ({ auth: { accessToken: 'access-1' } }),
      extra: undefined,
      endpoint: 'test',
      type: 'query' as const,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return baseQuery()(
      { url: '/x', method: 'POST', headers } as any,
      api as any,
      {},
    );
  };

  it('defaults to JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(200, envelope({ ok: true })),
    );

    await runWith();

    const request = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(request.headers.get('Content-Type')).toBe('application/json');
  });

  it('drops the header entirely for a multipart request', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(200, envelope({ ok: true })),
    );

    await runWith({ 'Content-Type': 'multipart/form-data' });

    const request = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(request.headers.get('Content-Type')).toBeNull();
  });
});

describe('retries', () => {
  it('retries a 500 and returns the eventual success', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse(500, envelope(null)))
      .mockResolvedValueOnce(jsonResponse(200, envelope({ ok: true })));

    const { result } = runQuery('/road/own-roads');
    await expect(result).resolves.toMatchObject({
      data: { data: { ok: true } },
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'never sends a %s twice, since the first may have arrived',
    async (method) => {
      (global.fetch as jest.Mock).mockResolvedValue(
        jsonResponse(503, envelope(null)),
      );

      const { result } = runQuery('/favorites/toggle-road', method);
      await expect(result).resolves.toMatchObject({ error: { status: 503 } });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    },
  );

  it('does not retry a 4xx, which will fail identically', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(404, envelope(null)),
    );

    const { result } = runQuery('/road/missing');
    await expect(result).resolves.toMatchObject({ error: { status: 404 } });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('401 handling', () => {
  it('refreshes the session and replays the original request', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse(401, envelope(null)))
      .mockResolvedValueOnce(
        jsonResponse(
          200,
          envelope({
            userId: 'u1',
            accessToken: 'access-2',
            refreshToken: 'refresh-2',
          }),
        ),
      )
      .mockResolvedValueOnce(jsonResponse(200, envelope({ ok: true })));

    const { result, api } = runQuery('/road/own-roads');
    await expect(result).resolves.toMatchObject({
      data: { data: { ok: true } },
    });

    expect(requestedUrls()).toEqual([
      'http://api.test/api/road/own-roads',
      'http://api.test/api/auth/refresh-token',
      'http://api.test/api/road/own-roads',
    ]);
    expect(api.dispatch).toHaveBeenCalledWith(
      sessionRefreshed({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      }),
    );
  });

  it('clears the session when the refresh itself fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse(401, envelope(null)))
      .mockResolvedValueOnce(jsonResponse(401, envelope(null)));

    const { result, api } = runQuery('/road/own-roads');
    await expect(result).resolves.toMatchObject({ error: { status: 401 } });

    expect(tokenStorage.clear).toHaveBeenCalled();
    expect(api.dispatch).toHaveBeenCalledWith(sessionCleared());
  });

  it.each([
    [
      'the phone is offline',
      () => Promise.reject(new TypeError('Network request failed')),
    ],
    [
      'the server is down',
      () => Promise.resolve(jsonResponse(503, envelope(null))),
    ],
  ])(
    'keeps the session when the refresh fails because %s',
    async (_label, refresh) => {
      (global.fetch as jest.Mock).mockImplementation((request: Request) => {
        const url = typeof request === 'string' ? request : request.url;
        return url.endsWith('/auth/refresh-token')
          ? refresh()
          : Promise.resolve(jsonResponse(401, envelope(null)));
      });

      const { result, api } = runQuery('/road/own-roads');
      const outcome = await result;

      expect(outcome.error?.status).not.toBe(401);
      expect(tokenStorage.clear).not.toHaveBeenCalled();
      expect(api.dispatch).not.toHaveBeenCalledWith(sessionCleared());
    },
  );

  it('does not try to refresh when there is no refresh token', async () => {
    jest
      .spyOn(tokenStorage, 'get')
      .mockResolvedValue({ accessToken: null, refreshToken: null });
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(401, envelope(null)),
    );

    const { result, api } = runQuery('/road/own-roads');
    await expect(result).resolves.toMatchObject({ error: { status: 401 } });

    expect(requestedUrls()).toEqual(['http://api.test/api/road/own-roads']);
    expect(api.dispatch).toHaveBeenCalledWith(sessionCleared());
  });

  it('leaves a rejected sign-in alone instead of refreshing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(401, envelope(null)),
    );

    const { result, api } = runQuery('/auth/sign-in', 'POST');
    await expect(result).resolves.toMatchObject({ error: { status: 401 } });

    expect(requestedUrls()).toEqual(['http://api.test/api/auth/sign-in']);
    expect(tokenStorage.clear).not.toHaveBeenCalled();
    expect(api.dispatch).not.toHaveBeenCalledWith(sessionCleared());
  });

  it('shares one refresh between concurrent 401s', async () => {
    (global.fetch as jest.Mock).mockImplementation((request: Request) => {
      const url = typeof request === 'string' ? request : request.url;
      if (url.endsWith('/auth/refresh-token')) {
        return Promise.resolve(
          jsonResponse(
            200,
            envelope({
              userId: 'u1',
              accessToken: 'access-2',
              refreshToken: 'refresh-2',
            }),
          ),
        );
      }
      const seen = requestedUrls().filter((seenUrl) => seenUrl === url).length;
      return Promise.resolve(
        seen > 1
          ? jsonResponse(200, envelope({ ok: true }))
          : jsonResponse(401, envelope(null)),
      );
    });

    await Promise.all([
      runQuery('/road/own-roads').result,
      runQuery('/favorites').result,
    ]);

    const refreshCalls = requestedUrls().filter((url) =>
      url.endsWith('/auth/refresh-token'),
    );
    expect(refreshCalls).toHaveLength(1);
  });
});

describe('an access token that has run out', () => {
  const jwt = (secondsFromNow: number) => {
    const part = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    const exp = Math.floor(Date.now() / 1000) + secondsFromNow;
    return `${part({ alg: 'HS256' })}.${part({ userId: 'u1', exp })}.sig`;
  };

  // A store whose token follows the refresh, as the real one does.
  const runWithToken = (url: string, initialToken: string) => {
    let accessToken = initialToken;
    const api = {
      signal: new AbortController().signal,
      dispatch: jest.fn((action: { type: string; payload?: unknown }) => {
        if (action.type === sessionRefreshed.type) {
          accessToken = (action.payload as { accessToken: string }).accessToken;
        }
        return action;
      }),
      getState: () => ({ auth: { accessToken } }),
      abort: jest.fn(),
      extra: undefined,
      endpoint: 'test',
      type: 'query' as const,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return baseQuery()({ url, method: 'GET' }, api as any, {});
  };

  const refreshed = () =>
    jsonResponse(
      200,
      envelope({
        userId: 'u1',
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      }),
    );

  const answerRefreshThenOk = () =>
    (global.fetch as jest.Mock).mockImplementation((request: Request) =>
      Promise.resolve(
        request.url.endsWith('/auth/refresh-token')
          ? refreshed()
          : jsonResponse(200, envelope({ ok: true })),
      ),
    );

  it('is refreshed before the request, saving the 401 round trip', async () => {
    answerRefreshThenOk();

    await expect(runWithToken('/favorites', jwt(-60))).resolves.toMatchObject({
      data: { data: { ok: true } },
    });

    expect(requestedUrls()).toEqual([
      'http://api.test/api/auth/refresh-token',
      'http://api.test/api/favorites',
    ]);
    const request = (global.fetch as jest.Mock).mock.calls[1][0];
    expect(request.headers.get('Authorization')).toBe('Bearer access-2');
  });

  it('is refreshed when it is about to run out', async () => {
    answerRefreshThenOk();

    await runWithToken('/favorites', jwt(10));

    expect(requestedUrls()[0]).toBe('http://api.test/api/auth/refresh-token');
  });

  it('is left alone while it still has time', async () => {
    answerRefreshThenOk();

    await runWithToken('/favorites', jwt(600));

    expect(requestedUrls()).toEqual(['http://api.test/api/favorites']);
  });

  it('is refreshed once for every request the screens send together', async () => {
    answerRefreshThenOk();
    const token = jwt(-60);

    await Promise.all([
      runWithToken('/favorites', token),
      runWithToken('/road/own-roads', token),
      runWithToken('/road/own-roads/summary', token),
    ]);

    expect(
      requestedUrls().filter((url) => url.endsWith('/auth/refresh-token')),
    ).toHaveLength(1);
    expect(requestedUrls()).toHaveLength(4);
  });

  it('still sends the request when the refresh cannot be made', async () => {
    (global.fetch as jest.Mock).mockImplementation((request: Request) =>
      request.url.endsWith('/auth/refresh-token')
        ? Promise.reject(new TypeError('Network request failed'))
        : Promise.resolve(jsonResponse(200, envelope({ ok: true }))),
    );

    await expect(runWithToken('/favorites', jwt(-60))).resolves.toMatchObject({
      data: { data: { ok: true } },
    });
    expect(tokenStorage.clear).not.toHaveBeenCalled();
  });

  it('does not hold up a sign-in', async () => {
    answerRefreshThenOk();

    await runWithToken('/auth/sign-in', jwt(-60));

    expect(requestedUrls()).toEqual(['http://api.test/api/auth/sign-in']);
  });
});
