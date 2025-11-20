import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
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
    profile: unknown,
    done: VerifyCallback,
  ) {
    const email =
      Array.isArray((profile as any)?.emails) &&
      (profile as any).emails[0]?.value
        ? String((profile as any).emails[0].value)
        : '';
    const firstName = (profile as any)?.name?.givenName
      ? String((profile as any).name.givenName)
      : '';
    const lastName = (profile as any)?.name?.familyName
      ? String((profile as any).name.familyName)
      : '';
    const picture =
      Array.isArray((profile as any)?.photos) &&
      (profile as any).photos[0]?.value
        ? String((profile as any).photos[0].value)
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
