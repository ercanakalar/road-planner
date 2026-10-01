import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { KVKK_CONSENT_VERSION } from 'constants/kvkk';
import authReducer, { sessionRestored } from 'store/slices/authSlice';
import kvkkReducer, { kvkkAccepted, kvkkHydrated } from 'store/slices/kvkkSlice';
import { consentService } from 'store/services/consentService';
import { KvkkConsentRecord } from 'types/kvkk';
import consentMiddleware from './consent-middleware';

const CONSENT: KvkkConsentRecord = {
  version: KVKK_CONSENT_VERSION,
  acceptedAt: '2026-09-30T08:00:00.000Z',
  language: 'tr',
};

const SESSION = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  userId: 'user-1',
};

const makeStore = () =>
  configureStore({
    reducer: combineReducers({
      auth: authReducer,
      kvkk: kvkkReducer,
      [consentService.reducerPath]: consentService.reducer,
    }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware()
        .prepend(consentMiddleware.middleware)
        .concat(consentService.middleware),
  });

const ok = () =>
  new Response(
    JSON.stringify({ status: 'success', data: { recorded: true } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );

const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

const consentRequests = () =>
  (global.fetch as jest.Mock).mock.calls
    .map(([request]) => request as Request)
    .filter((request) => request.url.endsWith('/consent'));

beforeEach(() => {
  global.fetch = jest.fn().mockImplementation(async () => ok()) as never;
});

describe('consent middleware', () => {
  it('tells the account about the consent given on the phone once a session is restored', async () => {
    const store = makeStore();
    store.dispatch(kvkkHydrated(CONSENT));

    store.dispatch(sessionRestored(SESSION));
    await settle();

    const [request] = consentRequests();
    expect(request.method).toBe('POST');
    expect(request.headers.get('Authorization')).toBe('Bearer access-token');
    await expect(request.json()).resolves.toEqual({
      noticeVersion: KVKK_CONSENT_VERSION,
      acceptedAt: CONSENT.acceptedAt,
      language: 'tr',
    });
  });

  it('records a notice accepted again while signed in', async () => {
    const store = makeStore();
    store.dispatch(sessionRestored(SESSION));
    await settle();
    (global.fetch as jest.Mock).mockClear();

    store.dispatch(kvkkAccepted(CONSENT));
    await settle();

    expect(consentRequests()).toHaveLength(1);
  });

  it('sends nothing for a phone nobody is signed in on', async () => {
    const store = makeStore();

    store.dispatch(kvkkAccepted(CONSENT));
    store.dispatch(sessionRestored(null));
    await settle();

    expect(consentRequests()).toHaveLength(0);
  });

  it('never sends a consent to an outdated notice', async () => {
    const store = makeStore();
    store.dispatch(kvkkHydrated({ ...CONSENT, version: '2020-01-01' }));

    store.dispatch(sessionRestored(SESSION));
    await settle();

    expect(consentRequests()).toHaveLength(0);
  });

  it('shrugs off a failed request rather than breaking the sign-in', async () => {
    global.fetch = jest.fn().mockImplementation(
      async () =>
        new Response(JSON.stringify({ status: 'error', message: 'no' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
    ) as never;
    const store = makeStore();
    store.dispatch(kvkkHydrated(CONSENT));

    expect(() => store.dispatch(sessionRestored(SESSION))).not.toThrow();
    await settle();

    expect(store.getState().auth.isLoggedIn).toBe(true);
  });
});
