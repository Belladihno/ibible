// src/shared/constant/systemMessages.ts

export const USER_LOGOUT_SUCCESS = 'User logged out and tokens revoked';
export const INVALID_TOKEN_PAYLOAD = 'Invalid token payload';

export const USER_DELETED = 'User deleted from database';
export const INVALID_USER_ID = 'Invalid user id';

export const USER_UPDATED = 'User updated successfully';

export const USER_SIGNUP_SUCCESS = 'User successfully signed up';
export const USER_ALREADY_EXISTS =
  'User with this email or phone number already exists';

export const USER_LOGIN_SUCCESS = 'User successfully logged in';
export const INVALID_CREDENTIALS = 'Invalid credentials';

export const TOKEN_REFRESH_SUCCESS = 'Token successfully refreshed';
export const INVALID_AUTH_HEADER =
  'Invalid Authorization header format. Expected: Bearer <token>';
export const MISSING_AUTH_HEADER = 'Missing Authorization header';

export const PASSWORD_RESET_REQUESTED = 'Request successful';
export const PASSWORD_RESET_SUCCESS = 'Password successfully reset';
export const INVALID_RESET_TOKEN = 'Invalid or expired reset token';

export const CURRENT_USER_INFO = 'Current user information';

export const EMAIL_VERIFIED = 'Email verified successfully';
export const INVALID_EMAIL_TOKEN =
  'Invalid or expired token | Email verification token has expired';
export const EMAIL_TOKEN_ALREADY_USED =
  'Invalid or already used verification token';

export const SUCCESSFUL_REQUEST = 'Request successful';
export const WAITLIST_ALREADY_EXIST = 'waitlist already exist';

export const UNAUTHENTICATED_MESSAGE = 'User is unauthenticated';
export const INVALID_TOKEN = 'Invalid token';

export const SESSION_NOT_FOUND = 'Meditation session not found';
export const SESSION_ALREADY_COMPLETED = 'Meditation session already completed';
export const MEDITATION_PLAN_UPDATED =
  'Meditation preferences updated successfully';
export const SESSION_STARTED = 'Meditation session started successfully';
export const SESSION_COMPLETED = 'Meditation session completed successfully';
export const MILESTONE_REACHED =
  'Congratulations! You reached a meditation milestone';
