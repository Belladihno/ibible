import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MeditationService } from './meditation.service';
// import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MeditationSchedulerService {
  private readonly logger = new Logger(MeditationSchedulerService.name);

  constructor(
    private readonly meditationService: MeditationService,
    // private readonly notificationsService: NotificationsService, // Add when available
  ) {}

  // Run at 6 AM every day
  @Cron('0 6 * * *', {
    name: 'morning-meditation-reminder',
    timeZone: 'UTC',
  })
  async sendMorningReminders() {
    this.logger.log('Starting morning meditation reminders...');

    try {
      const users = await this.meditationService.getUsersForMorningReminder();

      this.logger.log(`Found ${users.length} users for morning meditation`);

      for (const { userId, verse } of users) {
        try {
          // TODO: Integrate with Notifications Module
          // await this.notificationsService.sendPushNotification({
          //   userId,
          //   title: 'Time for morning meditation 🙏',
          //   body: `${verse.reference}: "${verse.text}"`,
          //   type: 'meditation_reminder',
          //   data: { sessionType: 'morning', verse },
          // });

          this.logger.debug(`Would send morning reminder to user ${userId}`);
        } catch (error) {
          this.logger.error(
            `Failed to send reminder to user ${userId}:`,
            error,
          );
        }
      }

      this.logger.log('Morning meditation reminders completed');
    } catch (error) {
      this.logger.error('Error sending morning reminders:', error);
    }
  }

  // Run at 8 PM every day
  @Cron('0 20 * * *', {
    name: 'evening-meditation-reminder',
    timeZone: 'UTC',
  })
  async sendEveningReminders() {
    this.logger.log('Starting evening meditation reminders...');

    try {
      const users = await this.meditationService.getUsersForEveningReminder();

      this.logger.log(`Found ${users.length} users for evening meditation`);

      for (const { userId, verse } of users) {
        try {
          // TODO: Integrate with Notifications Module
          this.logger.debug(`Would send evening reminder to user ${userId}`);
        } catch (error) {
          this.logger.error(
            `Failed to send reminder to user ${userId}:`,
            error,
          );
        }
      }

      this.logger.log('Evening meditation reminders completed');
    } catch (error) {
      this.logger.error('Error sending evening reminders:', error);
    }
  }
}
