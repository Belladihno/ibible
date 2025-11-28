import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrayerReminder } from 'src/entities/prayer-reminder.entity';
import { Prayer } from 'src/entities/prayer.entity';
import { PrayerReminderController } from './prayer-reminder.controller';
import { PrayerReminderService } from './prayer-reminder.service';

@Module({
  imports: [TypeOrmModule.forFeature([PrayerReminder, Prayer])],
  controllers: [PrayerReminderController],
  providers: [PrayerReminderService],
  exports: [PrayerReminderService],
})
export class PrayerReminderModule {}
