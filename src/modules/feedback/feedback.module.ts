import appConfig from 'src/config/auth.config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { Feedback } from '../../entities/feedback.entity';
import { AuthGuard } from 'src/guards/auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Feedback]),
    JwtModule.register({
      secret: appConfig().jwtSecret,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService, AuthGuard],
})
export class FeedbackModule {}
