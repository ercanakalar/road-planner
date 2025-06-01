import { createSlice } from '@reduxjs/toolkit';
import authenticationService from '../services/authenticationService';
import { IAuthState } from 'types/store/auth-type';
import { Slice, SliceCaseReducers } from '@reduxjs/toolkit';
import localStorageService from 'services/localStorageService';
import { TokenType } from 'types/libs/auth';

const initialState: IAuthState = {
  isLoading: false,
  isLoggedIn: false,
  accessToken: null,
  refreshToken: null,
  state: 'initial',
  user: null,
  errors: null,
};

interface SetAuthAction {
  payload: {
    accessToken: string;
    refreshToken: string;
    user: any;
  };
}

export const authSlice: Slice<
  IAuthState,
  SliceCaseReducers<IAuthState>
> = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state: IAuthState) => {
      localStorageService.removeItem(TokenType.ACCESS_TOKEN);
      localStorageService.removeItem(TokenType.REFRESH_TOKEN);
      state.isLoggedIn = false;
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.state = 'initial';
      state.errors = null;
    },
    clearAuth: (state: IAuthState) => {
      state.isLoggedIn = false;
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.state = 'initial';
      state.errors = null;
    },
  },
  extraReducers: (builder: any) => {
    const { signIn } = authenticationService.endpoints;
    builder
      .addMatcher(
        signIn.matchFulfilled,
        (state: IAuthState, action: SetAuthAction) => {
          const { accessToken, refreshToken, user } = action.payload;
          state.accessToken = accessToken;
          state.refreshToken = refreshToken;
          state.user = user;
          state.isLoggedIn = true;
          state.errors = null;
          state.state = 'authenticated';
        }
      )
      .addMatcher(signIn.matchRejected, (state: IAuthState, action: any) => {
        state.errors = action?.error?.data || 'Unknown error';
        state.isLoggedIn = false;
        state.state = 'error';
      });
  },
});

export const { logout, clearAuth } = authSlice.actions;

export default authSlice.reducer;
