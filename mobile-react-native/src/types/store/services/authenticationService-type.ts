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

export const RESET_CODE_LENGTH = 5;

export interface ForgotPasswordArgs {
  email: string;
}

export interface ChangePasswordArgs {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface VerifyResetCodeArgs {
  email: string;
  code: string;
}

export interface VerifyResetCodeResponse {
  resetToken: string;
  expiresAt: string;
}

export interface ResetPasswordArgs {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface PasswordResetLockout {
  retryAfterSeconds: number;
  lockedUntil: string;
}
