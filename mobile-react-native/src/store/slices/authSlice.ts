import { createSlice, isAnyOf, PayloadAction } from '@reduxjs/toolkit';

import { authenticationService } from '../services/authenticationService';
import { sessionCleared, sessionRefreshed } from 'store/actions/sessionActions';

import { IAuthState, authInitialState } from 'types/store/auth-type';

type SessionPayload = {
  accessToken: string;
  refreshToken: string;
  userId?: string | null;
};

const applySession = (state: IAuthState, session: SessionPayload) => {
  state.accessToken = session.accessToken;
  state.refreshToken = session.refreshToken;
  if (session.userId !== undefined) state.userId = session.userId;
  state.isLoggedIn = true;
  state.isLoading = false;
  state.errors = null;
  state.state = 'authenticated';
};

const clearSession = (state: IAuthState) => {
  state.accessToken = null;
  state.refreshToken = null;
  state.userId = null;
  state.isLoggedIn = false;
  state.isLoading = false;
  state.errors = null;
  state.state = 'initial';
};

export const authSlice = createSlice({
  name: 'auth',
  initialState: authInitialState,
  reducers: {
    logout: clearSession,
    clearAuth: clearSession,
    setUserId: (state, action: PayloadAction<string | null>) => {
      state.userId = action.payload;
    },
    sessionRestored: (state, action: PayloadAction<SessionPayload | null>) => {
      if (action.payload) applySession(state, action.payload);
      else clearSession(state);
      state.isLoading = false;
    },
    sessionRestoreStarted: (state) => {
      state.isLoading = true;
    },
  },
  extraReducers: (builder) => {
    const {
      signIn,
      signUp,
      validateRefreshToken,
      logout: logoutEndpoint,
    } = authenticationService.endpoints;

    builder
      .addCase(sessionRefreshed, (state, action) => {
        applySession(state, action.payload);
      })
      .addCase(sessionCleared, clearSession)

      .addMatcher(
        isAnyOf(signIn.matchFulfilled, signUp.matchFulfilled),
        (state, { payload }) => {
          applySession(state, {
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            userId: payload.userId,
          });
        },
      )
      .addMatcher(signIn.matchRejected, (state, action) => {
        state.errors =
          (action.payload?.data as unknown) ?? 'Unable to sign in right now.';
        state.isLoggedIn = false;
        state.state = 'error';
      })

      .addMatcher(validateRefreshToken.matchFulfilled, (state, { payload }) => {
        applySession(state, {
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          userId: payload.userId,
        });
      })
      .addMatcher(validateRefreshToken.matchRejected, clearSession)

      .addMatcher(logoutEndpoint.matchFulfilled, clearSession)
      .addMatcher(logoutEndpoint.matchRejected, clearSession);
  },
});

export const {
  logout,
  clearAuth,
  setUserId,
  sessionRestored,
  sessionRestoreStarted,
} = authSlice.actions;

export default authSlice.reducer;
