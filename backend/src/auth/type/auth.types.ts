export type JwtPayload = {
  userId: string;
  email: string;
  iat: number;
  exp: number;
};

export type AccessTokenType = {
  userId: string;
  email: string;
  permissions?: unknown[];
};

export type RefreshTokenType = {
  userId: string;
  email: string;
};

export type GoogleAuthClient = {
  /** Google's stable account id — `id` from userinfo, `sub` in an id token. */
  id?: string;
  email: string;
  verified_email?: boolean | string;
  email_verified?: boolean | string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

/**
 * The subset of a Google account this application stores. Assembled either from
 * a verified id token (native sign-in) or from the userinfo endpoint (the web
 * OAuth callback), so both paths can feed the same persistence code.
 */
export type GoogleProfile = {
  email: string;
  googleId?: string;
  firstName?: string;
  lastName?: string;
  photo?: string;
};
