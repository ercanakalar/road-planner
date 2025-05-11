import { Request } from 'express';

export type SignUpData = {
  email: string;
  password: string;
  confirmPassword: string;
};

export type SignInData = {
  email: string;
  password: string;
};

export type ResetPassword = {
  password: string;
  confirmPassword: string;
};

export interface RefreshRequest extends Request {
  user: JwtPayload & { refreshToken: string };
}

export type JwtPayload = {
  userId: string;
  email: string;
  iat: number;
  exp: number;
};

export type AccessTokenType = {};
export type RefreshTokenType = {};
