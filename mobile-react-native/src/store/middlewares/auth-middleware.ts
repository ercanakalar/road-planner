import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

import collectionCacheStorage from 'services/collectionCacheStorage';
import tokenStorage from 'services/tokenStorage';
import { resetAllApiStates } from 'store/actions/authAction';
import { prefetchCollections } from 'store/actions/collectionCacheActions';
import { sessionCleared, sessionRefreshed } from 'store/actions/sessionActions';
import { authenticationService } from 'store/services/authenticationService';
import { clearAuth, logout, sessionRestored } from 'store/slices/authSlice';
import type { AppDispatch } from 'store';

const authMiddleware = createListenerMiddleware();

const {
  signIn,
  signUp,
  signInWithGoogle,
  validateRefreshToken,
  logout: logoutEndpoint,
} = authenticationService.endpoints;

const isSessionIssued = isAnyOf(
  signIn.matchFulfilled,
  signUp.matchFulfilled,
  signInWithGoogle.matchFulfilled,
  validateRefreshToken.matchFulfilled,
);

authMiddleware.startListening({
  matcher: isSessionIssued,
  effect: async (action, listenerApi) => {
    if (!isSessionIssued(action)) return;

    const { accessToken, refreshToken } = action.payload;
    if (!accessToken || !refreshToken) return;

    (listenerApi.dispatch as AppDispatch)(prefetchCollections());

    await tokenStorage.save({ accessToken, refreshToken });
  },
});

// A session restored at launch: fetch what the Routes and Favourites screens
// show now, behind whatever the last session left in the cache, instead of
// waiting for each screen to be opened.
authMiddleware.startListening({
  actionCreator: sessionRestored,
  effect: (action, listenerApi) => {
    if (!action.payload) return;
    (listenerApi.dispatch as AppDispatch)(prefetchCollections());
  },
});

authMiddleware.startListening({
  actionCreator: sessionRefreshed,
  effect: async (action) => {
    await tokenStorage.save(action.payload);
  },
});

authMiddleware.startListening({
  matcher: isAnyOf(sessionCleared, logout, clearAuth),
  effect: async (_action, listenerApi) => {
    await Promise.all([tokenStorage.clear(), collectionCacheStorage.clear()]);
    (listenerApi.dispatch as AppDispatch)(resetAllApiStates());
  },
});

// Signing out through the server ends the session in the auth slice without
// any of the actions above, so the saved collections are dropped here too.
authMiddleware.startListening({
  matcher: isAnyOf(logoutEndpoint.matchFulfilled, logoutEndpoint.matchRejected),
  effect: async () => {
    await collectionCacheStorage.clear();
  },
});

export default authMiddleware;
