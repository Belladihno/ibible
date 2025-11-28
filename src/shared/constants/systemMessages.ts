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
export const DELETE_BOOKMARK = 'Bookmark deleted successfully';
export const BOOKMARK_NOT_FOUND = 'Bookmark not found';
export const DELETE_BY_ID = 'Delete a bookmark by ID';
export const BOOKMARK_FETCHED = 'Bookmarks fetched successfully';
export const FETCH_BOOKMARK_LIST = 'List of bookmarks fetched successfully';
export const BOOKMARK_FOR_USER = 'List of bookmarks for user';
export const BOOKMARK_CREATED = 'Bookmark created successfully';
export const VERSE_ALREADY_BOOKMARKED = 'Verse already bookmarked';
export const INVALID_PAYLOAD_OR_BOOKMARK_ALREADY =
  'Invalid payload or bookmark already exists';
export const USER_NOT_FOUND = 'user not found';
export const BOOK_CHAPTER_VERSE_REQUIRED =
  'Book, chapter, and verse are required';
export const PAYLOAD_CANNOT_BE_EMPTY = 'payload cannot be empty';

export const VERIFICATION_CODE_RESENT = 'Verification code resent successfully';
export const PASSWORD_RESET_CODE_RESENT =
  'Password reset code resent successfully';

export const EMOTION_REQUIRED = 'Emotion required';

export const EMOTION_LOGGED_AND_VERSES_RETURNED =

  'Emotion logged and verse returned successfully';

export const INVALID_PAYLOAD = 'Invalid Payload or user not found';
export const HISTORY_FETCHED = 'history fetched succesfully';

// REMINDERS MESSAGES
// Prayer Reminder Messages

export const REMINDER_CREATED = 'Reminder created successfully';
export const REMINDER_UPDATED = 'Reminder updated successfully';
export const REMINDER_DELETED = 'Reminder deleted successfully';

export const REMINDERS_FETCHED = 'Reminders fetched successfully';
export const REMINDER_FETCHED = 'Reminder fetched successfully';

export const REMINDER_NOT_FOUND = 'Reminder not found';
export const REMINDER_NOT_OWNED =
  'Reminder not found or not owned by the authenticated user';

export const PRAYER_NOT_FOUND_OR_NOT_OWNED =
  'Prayer not found or not owned by the authenticated user';

export const REMINDER_INVALID_PAYLOAD = 'Invalid reminder payload';
export const REMINDER_ID_REQUIRED = 'Reminder ID is required';
export const PRAYER_ID_MISMATCH =
  'Path prayerId does not match prayerId in request body';
