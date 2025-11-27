import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrayerReminder } from 'src/entities/prayer-reminder.entity';
import { Prayer } from 'src/entities/prayer.entity';
import { TempPrayer } from 'src/entities/temp-prayer.entity';
import { GeminiService } from '../chat/services/gemini.service';
import { PrayerGeminiService } from './services/prayer-gemini.service';
import { AiPrayerService } from './ai-prayer.service';
import { PrayerController } from './prayer.controller';
import { PrayerService } from './prayer.service';

@Module({
  imports: [TypeOrmModule.forFeature([Prayer, PrayerReminder, TempPrayer])],
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
