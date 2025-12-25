import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { User } from 'src/entities/user.entity';
import { UserActivity } from 'src/entities/user-activity.entity';
import { AppMetric } from 'src/entities/app-metric.entity';
import { AccessToken } from 'src/entities/access-token.entity';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AppMetricsSyncService } from './app-metrics-sync.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserActivity, AppMetric, AccessToken]),
    ScheduleModule.forRoot(),
    JwtModule,
  ],
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService, AppMetricsSyncService, AuthGuard],
  exports: [AdminAnalyticsService],
})
export class AdminAnalyticsModule {}
