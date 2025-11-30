import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  // Minimal stub used by memories module. Real implementation should
  // send push/email/notification to user devices and persist notifications.
  async sendToUser(
    userId: string,
    message: string,
    meta?: Record<string, unknown>,
  ) {
    this.logger.log(
      `sendToUser -> user:${userId} message:${message} meta:${JSON.stringify(meta)}`,
    );
    return Promise.resolve(true);
  }
}
