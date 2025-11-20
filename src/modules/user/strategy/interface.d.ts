export interface UserPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  sub?: string;
  authProvider?: string;
}
