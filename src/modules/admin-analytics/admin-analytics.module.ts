import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { UserActivity } from 'src/entities/user-activity.entity';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserActivity]), JwtModule],
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService],
  exports: [AdminAnalyticsService],
})
export class AdminAnalyticsModule {}
