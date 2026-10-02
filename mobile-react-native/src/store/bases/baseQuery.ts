import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  fetchBaseQuery,
} from '@reduxjs/toolkit/query';

import i18n from 'i18n';

import { API_BASE_URL } from 'constants/apiUrl';
import tokenStorage from 'services/tokenStorage';
import { sessionCleared, sessionRefreshed } from 'store/actions/sessionActions';
import type { RootState } from 'store';

const TIMEOUT_MS = 15000;

export const UPLOAD_TIMEOUT_MS = 60000;

const MAX_RETRIES = 2;

export const MULTIPART = 'multipart/form-data';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  timeout: TIMEOUT_MS,
  prepareHeaders: async (headers, { getState }) => {
    if (headers.get('Content-Type') === MULTIPART) {
      headers.delete('Content-Type');
    } else if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    headers.set('Accept-Language', i18n.language);

    const stateToken = (getState() as RootState).auth.accessToken;
    const token = stateToken ?? (await tokenStorage.getAccessToken());

    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

const isRetryableError = (error: FetchBaseQueryError): boolean => {
  if (error.status === 'FETCH_ERROR' || error.status === 'TIMEOUT_ERROR') {
    return true;
  }
  return typeof error.status === 'number' && error.status >= 500;
};

// Only a read is safe to send twice. A write that timed out may well have
// reached the server, and sending it again would add a second route or stop,
// or flip a favourite back to where it was.
const isSafeToRepeat = (args: string | FetchArgs): boolean => {
  const method = (
    typeof args === 'string' ? 'GET' : (args.method ?? 'GET')
  ).toUpperCase();
  return method === 'GET' || method === 'HEAD';
};

// What the server said about the refresh token itself. Only a refusal ends
// the session; a refresh that could not be made — no signal, a timeout, the
// server down — leaves it for the next request to try again.
const SESSION_REFUSED = new Set<unknown>([400, 401, 403]);

type RefreshOutcome =
  | { kind: 'refreshed' }
  | { kind: 'refused' }
  | { kind: 'unavailable'; error: FetchBaseQueryError };

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

let refreshInFlight: Promise<RefreshOutcome> | null = null;

const refreshSession = async (
  api: Parameters<BaseQueryFn>[1],
  extraOptions: Parameters<BaseQueryFn>[2],
): Promise<RefreshOutcome> => {
  const { refreshToken } = await tokenStorage.get();
  if (!refreshToken) return { kind: 'refused' };

  const result = await rawBaseQuery(
    {
      url: '/auth/refresh-token',
      method: 'POST',
      body: { refreshToken },
    },
    api,
    extraOptions,
  );

  if (result.error) {
    return SESSION_REFUSED.has(result.error.status)
      ? { kind: 'refused' }
      : { kind: 'unavailable', error: result.error };
  }

  const tokens = (result.data as { data?: unknown } | undefined)?.data as
    { accessToken?: string; refreshToken?: string } | undefined;

  if (!tokens?.accessToken || !tokens?.refreshToken) {
    return {
      kind: 'unavailable',
      error: {
        status: 'PARSING_ERROR',
        originalStatus: 200,
        data: String(result.data),
        error: 'The refreshed session carried no tokens',
      },
    };
  }

  await tokenStorage.save({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
  api.dispatch(
    sessionRefreshed({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }),
  );
  return { kind: 'refreshed' };
};

const isPublicAuthRoute = (args: string | FetchArgs): boolean => {
  const url = typeof args === 'string' ? args : args.url;
  return url.startsWith('/auth/');
};

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  { maxRetries?: number }
> = async (args, api, extraOptions) => {
  const maxRetries = extraOptions?.maxRetries ?? MAX_RETRIES;

  let result = await rawBaseQuery(args, api, extraOptions);

  const retries = isSafeToRepeat(args) ? maxRetries : 0;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    if (!result.error || !isRetryableError(result.error)) break;
    await delay(2 ** attempt * 300);
    result = await rawBaseQuery(args, api, extraOptions);
  }

  if (result.error?.status !== 401 || isPublicAuthRoute(args)) return result;

  refreshInFlight =
    refreshInFlight ??
    refreshSession(api, extraOptions).finally(() => {
      refreshInFlight = null;
    });

  const outcome = await refreshInFlight;

  if (outcome.kind === 'refused') {
    await tokenStorage.clear();
    api.dispatch(sessionCleared());
    return result;
  }

  // Still signed in. This request fails the way the refresh did — offline,
  // most likely — and the next one tries the refresh again.
  if (outcome.kind === 'unavailable') return { error: outcome.error };

  return rawBaseQuery(args, api, extraOptions);
};

const baseQuery = () => baseQueryWithReauth;

export default baseQuery;
