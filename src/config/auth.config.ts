import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiry: process.env.JWT_EXPIRY,
  adminSecret: process.env.ADMIN_SECRET,
  google: {
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    clientID: process.env.GOOGLE_CLIENT_ID,
    callbackURL: process.env.GOOGLE_CALLBACK_URI,
  },
}));
