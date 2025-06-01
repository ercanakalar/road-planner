export type SignUpRequest = {
  email: string;
  password: string;
  confirmPassword: string;
};

export type SignInRequest = {
  email: string;
  password: string;
};

export interface SignInResponse {
  accessToken: string;
  refreshToken: string;
  [key: string]: any;
}

export interface SignUpResponse {
  accessToken: string;
  refreshToken: string;
  [key: string]: any;
}

export enum TokenType {
  ACCESS_TOKEN = 'access_token',
  REFRESH_TOKEN = 'refresh_token',
}
