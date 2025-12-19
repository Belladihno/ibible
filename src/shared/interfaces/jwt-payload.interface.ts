import { UserRole } from '../../modules/user/enums/user.enums';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
  [key: string]: unknown; // allow additional fields
}
