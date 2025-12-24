import appConfig from 'src/config/auth.config';
import { UploadModule } from '../upload/upload.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { Feedback } from '../../entities/feedback.entity';
import { AccessToken } from '../../entities/access-token.entity';
import { AuthGuard } from 'src/guards/auth.guard';
import { OptionalAuthGuard } from 'src/guards/optional-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Feedback, AccessToken]),
    JwtModule.register({
      secret: appConfig().jwtSecret,
      signOptions: { expiresIn: '7d' },
    }),
    UploadModule,
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService, AuthGuard, OptionalAuthGuard],
})
export class FeedbackModule {}
