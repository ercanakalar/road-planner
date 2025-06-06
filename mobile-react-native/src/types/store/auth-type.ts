export interface IUser {
  email: string;
  firstName: string;
  lastName: string;
}
export interface IAuthState {
  isLoading: boolean;
  isLoggedIn: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  state: IAuthUserState;
  errors: any;
  userId: string | null;
}

export type IAuthUserState = 'initial' | 'error' | 'authenticated';

export const authInitialState: IAuthState = {
  isLoading: false,
  isLoggedIn: false,
  accessToken: null,
  refreshToken: null,
  state: 'initial',
  errors: null,
  userId: null,
};

export interface SetAuthAction {
  payload: {
    accessToken: string;
    refreshToken: string;
    user: any;
  };
}
