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
}

export interface SessionTokens {
  userId: string | null;
  accessToken: string;
  refreshToken: string;
}

export type SignUpArgsResponse = SessionTokens;
export type SignInArgsResponse = SessionTokens;
export type ValidateRefreshTokenResponse = SessionTokens;
