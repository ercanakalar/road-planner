export type SignUpRequest = {
  email: string;
  password: string;
  confirmPassword: string;
};

export type SignInRequest = {
  email: string;
  password: string;
};

export enum TokenType {
  ACCESS_TOKEN = 'access_token',
  REFRESH_TOKEN = 'refresh_token',
}
