import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

import tokenStorage from 'services/tokenStorage';
import { resetAllApiStates } from 'store/actions/authAction';
import { sessionCleared, sessionRefreshed } from 'store/actions/sessionActions';
import { authenticationService } from 'store/services/authenticationService';
import { favoriteService } from 'store/services/favoriteService';
import { roadService } from 'store/services/roadService';
import { clearAuth, logout } from 'store/slices/authSlice';
import type { AppDispatch } from 'store';

const authMiddleware = createListenerMiddleware();

const { signIn, signUp, signInWithGoogle, validateRefreshToken } =
  authenticationService.endpoints;

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

    // Signing in lands on My Routes, and favourites is one tab away. Asking
    // for both now means the request is already in flight while the screen
    // mounts, instead of starting once it has.
    const dispatch = listenerApi.dispatch as AppDispatch;
    dispatch(roadService.util.prefetch('getOwnRoads', undefined, { force: true }));
    dispatch(
      favoriteService.util.prefetch('getFavorites', undefined, { force: true }),
    );

    await tokenStorage.save({ accessToken, refreshToken });
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
    await tokenStorage.clear();
    (listenerApi.dispatch as AppDispatch)(resetAllApiStates());
  },
});

export default authMiddleware;
