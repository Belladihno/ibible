export interface UserPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  accessToken?: string;
}

interface JwtPayload {
  sub: string;
  email: string;
}
