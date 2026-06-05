export type JwtPayload = {
  userId: string;
  email: string;
  iat: number;
  exp: number;
};
