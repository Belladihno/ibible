import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  validate(
    req: unknown,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email =
      Array.isArray(profile.emails) && profile.emails[0]?.value
        ? String(profile.emails[0].value)
        : '';

    const firstName = profile.name?.givenName
      ? String(profile.name.givenName)
      : '';
    const lastName = profile.name?.familyName
      ? String(profile.name.familyName)
      : '';

    const picture =
      Array.isArray(profile.photos) && profile.photos[0]?.value
        ? String(profile.photos[0].value)
        : '';

    const user = {
      email,
      firstName,
      lastName,
      picture,
    };

    done(null, user);
  }
}
