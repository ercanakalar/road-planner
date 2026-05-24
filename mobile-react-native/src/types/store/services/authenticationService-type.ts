import { ToastType } from 'types/status-type';

export interface SignUpArgs {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignInArgs {
  email: string;
  password: string;
}

export interface ValidateRefreshTokenArgs {
  refreshToken: string;
  accessToken: string;
}

export interface SignUpArgsResponse {
  status: ToastType;
  header: string;
  message: string;
  data: {
    userId: string;
    password: string;
    confirmPassword: string;
  };
}
export interface SignInArgsResponse {
  status: ToastType;
  header: string;
  message: string;
  data: {
    userId: string;
    accessToken: string;
    refreshToken: string;
  };
}

export interface ValidateRefreshTokenResponse {
  data: {
    userId: string;
    accessToken: string;
    refreshToken: string;
  };
}
