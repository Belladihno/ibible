export interface UserPayload {
  email: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  sub?: string;
  authProvider?: string;
}
