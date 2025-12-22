import { Module } from '@nestjs/common';
import { StreaksController } from './streaks.controller';
import { StreaksService } from './streaks.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStreak } from '../../entities/user-streak.entity';
import { StreakActivity } from '../../entities/streak-activity.entity';
import appConfig from 'src/config/auth.config';
import { JwtModule } from '@nestjs/jwt';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthGuard } from 'src/guards/auth.guard';
@Module({
  imports: [
    TypeOrmModule.forFeature([UserStreak, StreakActivity]),
    AnalyticsModule,
    JwtModule.register({
      secret: appConfig().jwtSecret,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [StreaksController],
  providers: [StreaksService, AuthGuard],
  exports: [StreaksService],
})
export class StreaksModule {}
