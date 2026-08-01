import baseQuery from './baseQuery';
import tokenStorage from 'services/tokenStorage';
import { sessionCleared, sessionRefreshed } from 'store/actions/sessionActions';

/*
 * `baseQuery` carries the retry, refresh and replay logic, so it is exercised
 * against a stubbed `fetch` rather than through a store.
 */

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
      'http://api.test/road/own-roads',
      'http://api.test/auth/refresh-token',
      'http://api.test/road/own-roads',
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

  it('does not try to refresh when there is no refresh token', async () => {
    jest
      .spyOn(tokenStorage, 'get')
      .mockResolvedValue({ accessToken: null, refreshToken: null });
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(401, envelope(null)),
    );

    const { result, api } = runQuery('/road/own-roads');
    await expect(result).resolves.toMatchObject({ error: { status: 401 } });

    expect(requestedUrls()).toEqual(['http://api.test/road/own-roads']);
    expect(api.dispatch).toHaveBeenCalledWith(sessionCleared());
  });

  it('leaves a rejected sign-in alone instead of refreshing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(401, envelope(null)),
    );

    const { result, api } = runQuery('/auth/sign-in', 'POST');
    await expect(result).resolves.toMatchObject({ error: { status: 401 } });

    expect(requestedUrls()).toEqual(['http://api.test/auth/sign-in']);
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
