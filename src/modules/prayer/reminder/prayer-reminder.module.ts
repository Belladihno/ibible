import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PrayerReminder } from 'src/entities/prayer-reminder.entity';
import { Prayer } from 'src/entities/prayer.entity';
import { AccessToken } from 'src/entities/access-token.entity';
import { PrayerReminderController } from './prayer-reminder.controller';
import { PrayerReminderService } from './prayer-reminder.service';
import { AuthGuard } from 'src/guards/auth.guard';
import appConfig from 'src/config/auth.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrayerReminder, Prayer, AccessToken]),
    JwtModule.register({
      secret: appConfig().jwtSecret,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [PrayerReminderController],
  providers: [PrayerReminderService, AuthGuard],
  exports: [PrayerReminderService],
})
export class PrayerReminderModule {}
