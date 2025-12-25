import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prayer } from 'src/entities/prayer.entity';
import { TempPrayer } from 'src/entities/temp-prayer.entity';
import { PrayerReminderModule } from './reminder/prayer-reminder.module';
import { AiPrayerService } from './ai-prayer.service';
import { PrayerController } from './prayer.controller';
import { PrayerService } from './prayer.service';
import { PrayerReminder } from 'src/entities/prayer-reminder.entity';
import { GeminiModule } from '../gemini/gemini.module';
import { AccessToken } from 'src/entities/access-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prayer, TempPrayer, PrayerReminder, AccessToken]),
    PrayerReminderModule,
    GeminiModule,
  ],
  controllers: [PrayerController],
  providers: [PrayerService, AiPrayerService],
  exports: [PrayerService],
})
export class PrayerModule {}
