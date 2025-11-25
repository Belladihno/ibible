export interface JwtPayload {
  sub: string;
  email: string;
  exp: number;
  iat: number;
  [key: string]: unknown; // allow additional fields
}
