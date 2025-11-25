// src/meditation/meditation.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeditationController } from './meditation.controller';
import { MeditationService } from './meditation.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from 'src/guards/auth.guard';
import appConfig from 'src/config/auth.config';
import { MeditationPlan } from 'src/entities/meditation-plan.entity';
import { MeditationVerseService } from './meditation-verse.service';
import { MeditationSchedulerService } from './meditation-scheduler.service';
import { MeditationVerseLibrary } from 'src/entities/meditation-verse-library.entity';
import { MeditationDailyVerse } from 'src/entities/meditation-daily-verse.entity';
import { MeditationSession } from 'src//entities/meditation-session.entity';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MeditationPlan,
      MeditationSession,
      MeditationDailyVerse,
      MeditationVerseLibrary,
    ]),
    JwtModule.register({
      secret: appConfig().jwtSecret,
      signOptions: { expiresIn: '1d' },
    }),

    ScheduleModule.forRoot(), 
  ],
  controllers: [MeditationController],
  providers: [
    MeditationService,
    MeditationVerseService,
    MeditationSchedulerService,
    AuthGuard,
  ],

  exports: [MeditationService],
})
export class MeditationModule {}
