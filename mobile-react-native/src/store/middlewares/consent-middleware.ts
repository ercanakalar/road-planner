import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

import { authenticationService } from 'store/services/authenticationService';
import { consentService } from 'store/services/consentService';
import { sessionRestored } from 'store/slices/authSlice';
import { isKvkkConsentCurrent, kvkkAccepted } from 'store/slices/kvkkSlice';
import type { AppDispatch, RootState } from 'store';

const consentMiddleware = createListenerMiddleware();

const { signIn, signUp, signInWithGoogle } = authenticationService.endpoints;

// The notice is accepted on this phone, usually before any account exists.
// Whenever a session appears — a sign-in, a sign-up, a session restored at
// launch — or the notice is accepted again while signed in, the account is
// told which version was accepted and when, so the server can prove it.
consentMiddleware.startListening({
  matcher: isAnyOf(
    signIn.matchFulfilled,
    signUp.matchFulfilled,
    signInWithGoogle.matchFulfilled,
    sessionRestored,
    kvkkAccepted,
  ),
  effect: async (_action, listenerApi) => {
    const { auth, kvkk } = listenerApi.getState() as RootState;
    const { consent } = kvkk;

    if (!auth.isLoggedIn || !consent || !isKvkkConsentCurrent(consent)) return;

    const request = (listenerApi.dispatch as AppDispatch)(
      consentService.endpoints.grantConsent.initiate(consent),
    );

    // Best effort: a grant that does not get through is sent again at the
    // next sign-in or launch, and the server ignores one it already holds.
    await request.unwrap().catch(() => undefined);
    request.reset();
  },
});

export default consentMiddleware;
