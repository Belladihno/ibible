import { User } from 'src/entities/user.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { AccessToken } from '../../entities/access-token.entity';
import { EmailVerificationToken } from '../../entities/email-verification-token.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { JwtStrategy } from './strategy/jwt.strategy';
import { GoogleStrategy } from './strategy/google.strategy';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { EmailModule } from '../email/email.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      PasswordResetToken,
      RefreshToken,
      AccessToken,
      EmailVerificationToken,
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN');
        const expiresInSeconds = expiresIn ? parseInt(expiresIn) : 900;
        return {
          secret: configService.get<string>('JWT_SECRET') || 'fallback-secret',
          signOptions: {
            expiresIn: expiresInSeconds,
          },
        };
      },
      inject: [ConfigService],
    }),
    EmailModule,
  ],
  controllers: [UserController],
  providers: [UserService, JwtStrategy, GoogleStrategy],
  exports: [UserService],
})
export class UserModule {}
