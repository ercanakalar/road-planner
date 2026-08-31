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

/** What Google knew about the account, as the API stored it. */
export interface GoogleUserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  photo: string | null;
  nickName: string | null;
}

/**
 * Google sign-in answers with the stored profile as well as the session, so the
 * name and avatar it filled in are visible without a second call.
 */
export type GoogleSignInResponse = SessionTokens & {
  user?: GoogleUserProfile;
};

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
