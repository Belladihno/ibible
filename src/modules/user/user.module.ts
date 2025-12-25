import { User } from 'src/entities/user.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { AccessToken } from '../../entities/access-token.entity';
import { EmailVerificationToken } from '../../entities/email-verification-token.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { JwtStrategy } from './strategy/jwt.strategy';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { EmailModule } from '../email/email.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { UploadModule } from '../upload/upload.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthGuard } from 'src/guards/auth.guard';

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
    EmailModule,
    UploadModule,
    AnalyticsModule,
  ],
  controllers: [UserController],
  providers: [UserService, JwtStrategy],
  exports: [UserService],
})
export class UserModule {}
