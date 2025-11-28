import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prayer } from 'src/entities/prayer.entity';
import { TempPrayer } from 'src/entities/temp-prayer.entity';
import { PrayerReminderModule } from './reminder/prayer-reminder.module';
import { GeminiService } from '../chat/services/gemini.service';
import { PrayerGeminiService } from './services/prayer-gemini.service';
import { AiPrayerService } from './ai-prayer.service';
import { PrayerController } from './prayer.controller';
import { PrayerService } from './prayer.service';
import { PrayerReminder } from 'src/entities/prayer-reminder.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prayer, TempPrayer, PrayerReminder]),
    PrayerReminderModule,
  ],
  controllers: [PrayerController],
  providers: [
    PrayerService,
    AiPrayerService,
    GeminiService,
    PrayerGeminiService,
  ],
  exports: [PrayerService],
})
export class PrayerModule {}
