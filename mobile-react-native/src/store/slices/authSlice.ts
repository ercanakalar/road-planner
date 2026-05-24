import { createSlice } from '@reduxjs/toolkit';
import { Slice, SliceCaseReducers } from '@reduxjs/toolkit';

import { authenticationService } from '../services/authenticationService';

import {
  IAuthState,
  SetAuthAction,
  authInitialState,
} from 'types/store/auth-type';

export const authSlice: Slice<
  IAuthState,
  SliceCaseReducers<IAuthState>
> = createSlice({
  name: 'auth',
  initialState: authInitialState,
  reducers: {
    logout: (state) => {
      state.isLoggedIn = false;
      state.accessToken = null;
      state.refreshToken = null;
      state.state = 'initial';
      state.errors = null;
    },
    clearAuth: (state: IAuthState) => {
      state.isLoggedIn = false;
      state.accessToken = null;
      state.refreshToken = null;
      state.state = 'initial';
      state.errors = null;
    },
    setUserId: (state: IAuthState, action: { payload: string | null }) => {
      state.userId = action.payload;
    },
  },
  extraReducers: (builder: any) => {
    const { signIn, validateRefreshToken, logout } =
      authenticationService.endpoints;
    builder
      .addMatcher(
        signIn.matchFulfilled,
        (state: IAuthState, action: SetAuthAction) => {
          const { accessToken, refreshToken } = action.payload;
          state.accessToken = accessToken;
          state.refreshToken = refreshToken;
          state.isLoggedIn = true;
          state.errors = null;
          state.state = 'authenticated';
        },
      )
      .addMatcher(signIn.matchRejected, (state: IAuthState, action: any) => {
        state.errors = action?.error?.data || 'Unknown error';
        state.isLoggedIn = false;
        state.state = 'error';
      });
    builder
      .addMatcher(
        logout.matchFulfilled,
        (state: IAuthState, action: SetAuthAction) => {
          state.accessToken = null;
          state.refreshToken = null;
          state.isLoggedIn = false;
          state.errors = null;
          state.state = 'authenticated';
        },
      )
      .addMatcher(logout.matchRejected, (state: IAuthState, action: any) => {
        state.errors = action?.error?.data || 'Unknown error';
        state.isLoggedIn = false;
        state.state = 'error';
      });
    builder
      .addMatcher(
        validateRefreshToken.matchFulfilled,
        (state: IAuthState, action: SetAuthAction) => {
          const { accessToken, refreshToken } = action.payload;
          state.accessToken = accessToken;
          state.refreshToken = refreshToken;
          state.isLoggedIn = true;
          state.errors = null;
          state.state = 'authenticated';
        },
      )
      .addMatcher(
        validateRefreshToken.matchRejected,
        (state: IAuthState, action: any) => {
          state.errors = action?.error?.data || 'Unknown error';
          state.isLoggedIn = false;
          state.state = 'error';
        },
      );
  },
});

export const { logout, clearAuth, setUserId } = authSlice.actions;

export default authSlice.reducer;
