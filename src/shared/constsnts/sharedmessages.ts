// src/shared/constant/systemMessages.ts
export const SystemMessages = {
  USER_LOGOUT_SUCCESS: 'User logged out and tokens revoked',
  INVALID_TOKEN_PAYLOAD: 'Invalid token payload',

  USER_DELETED: 'User deleted from database',
  INVALID_USER_ID: 'Invalid user id',

  USER_UPDATED: 'User updated successfully',

  USER_SIGNUP_SUCCESS: 'User successfully signed up',
  USER_ALREADY_EXISTS: 'User with this email or phone number already exists',

  USER_LOGIN_SUCCESS: 'User successfully logged in',
  INVALID_CREDENTIALS: 'Invalid credentials',

  TOKEN_REFRESH_SUCCESS: 'Token successfully refreshed',
  INVALID_AUTH_HEADER: 'Invalid Authorization header format. Expected: Bearer <token>',
  MISSING_AUTH_HEADER: 'Missing Authorization header',

  PASSWORD_RESET_REQUESTED: 'Request successful',
  PASSWORD_RESET_SUCCESS: 'Password successfully reset',
  INVALID_RESET_TOKEN: 'Invalid or expired reset token',

  CURRENT_USER_INFO: 'Current user information',

  EMAIL_VERIFIED: 'Email verified successfully',
  INVALID_EMAIL_TOKEN: 'Invalid or expired token | Email verification token has expired',
  EMAIL_TOKEN_ALREADY_USED: 'Invalid or already used verification token',

  SUCCESSFUL_REQUEST: 'Request successful',
  WAITLIST_ALREADY_EXIST: 'waitlist already exist',
};
