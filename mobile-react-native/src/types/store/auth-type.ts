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
  user: any;
  errors: any;
}

export type IAuthUserState = 'initial' | 'error' | 'authenticated';
