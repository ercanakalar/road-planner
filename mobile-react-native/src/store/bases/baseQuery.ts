import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  fetchBaseQuery,
} from '@reduxjs/toolkit/query';

import appConfig from 'constants/appConfig';
import tokenStorage from 'services/tokenStorage';
import { sessionCleared, sessionRefreshed } from 'store/actions/sessionActions';
import type { RootState } from 'store';

const TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: appConfig.baseUrl,
  timeout: TIMEOUT_MS,
  prepareHeaders: async (headers, { getState }) => {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

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

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

let refreshInFlight: Promise<boolean> | null = null;

const refreshSession = async (
  api: Parameters<BaseQueryFn>[1],
  extraOptions: Parameters<BaseQueryFn>[2],
): Promise<boolean> => {
  const { refreshToken } = await tokenStorage.get();
  if (!refreshToken) return false;

  const result = await rawBaseQuery(
    {
      url: '/auth/refresh-token',
      method: 'POST',
      body: { refreshToken },
    },
    api,
    extraOptions,
  );

  const tokens = (result.data as { data?: unknown } | undefined)?.data as
    | { accessToken?: string; refreshToken?: string }
    | undefined;

  if (!tokens?.accessToken || !tokens?.refreshToken) return false;

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
  return true;
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

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
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

  const refreshed = await refreshInFlight;

  if (!refreshed) {
    await tokenStorage.clear();
    api.dispatch(sessionCleared());
    return result;
  }

  return rawBaseQuery(args, api, extraOptions);
};

const baseQuery = () => baseQueryWithReauth;

export default baseQuery;
