import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Prayer } from 'src/entities/prayer.entity';
import { TempPrayer } from 'src/entities/temp-prayer.entity';
import { AccessToken } from 'src/entities/access-token.entity';
import { PrayerReminderModule } from './reminder/prayer-reminder.module';
import { GeminiService } from '../chat/services/gemini.service';
import { PrayerGeminiService } from './services/prayer-gemini.service';
import { AiPrayerService } from './ai-prayer.service';
import { PrayerController } from './prayer.controller';
import { PrayerService } from './prayer.service';
import { PrayerReminder } from 'src/entities/prayer-reminder.entity';
import { AuthGuard } from 'src/guards/auth.guard';
import appConfig from 'src/config/auth.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prayer, TempPrayer, PrayerReminder, AccessToken]),
    JwtModule.register({
      secret: appConfig().jwtSecret,
      signOptions: { expiresIn: '7d' },
    }),
    PrayerReminderModule,
  ],
  controllers: [PrayerController],
  providers: [
    PrayerService,
    AiPrayerService,
    GeminiService,
    PrayerGeminiService,
    AuthGuard,
  ],
  exports: [PrayerService],
})
export class PrayerModule {}
