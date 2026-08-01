import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

import tokenStorage from 'services/tokenStorage';
import { resetAllApiStates } from 'store/actions/authAction';
import { sessionCleared, sessionRefreshed } from 'store/actions/sessionActions';
import { authenticationService } from 'store/services/authenticationService';
import { clearAuth, logout } from 'store/slices/authSlice';
import type { AppDispatch } from 'store';

const authMiddleware = createListenerMiddleware();

const { signIn, signUp, validateRefreshToken } =
  authenticationService.endpoints;

const isSessionIssued = isAnyOf(
  signIn.matchFulfilled,
  signUp.matchFulfilled,
  validateRefreshToken.matchFulfilled,
);

authMiddleware.startListening({
  matcher: isSessionIssued,
  effect: async (action) => {
    if (!isSessionIssued(action)) return;

    const { accessToken, refreshToken } = action.payload;
    if (!accessToken || !refreshToken) return;
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
