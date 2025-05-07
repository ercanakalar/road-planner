export type CreateUser = {
  email: string;
  password: string;
  confirmPassword: string;
};

export type LoginUser = {
  username: string;
  password: string;
};

export type JwtPayload = {};

export type AccessTokenType = {};
export type RefreshTokenType = {};
