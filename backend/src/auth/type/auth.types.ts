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
  id?: string;
  email: string;
  verified_email?: boolean | string;
  email_verified?: boolean | string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

export type GoogleProfile = {
  email: string;
  googleId?: string;
  firstName?: string;
  lastName?: string;
  photo?: string;
};
