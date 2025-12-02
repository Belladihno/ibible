import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName } from './queue-names.enum';

@Injectable()
export class QueueHealthService {
  private readonly logger = new Logger(QueueHealthService.name);

  constructor(
    @InjectQueue(QueueName.WAITLIST_SYNC)
    private waitlistQueue: Queue,
  ) {}

  async getQueueHealth(queueName: QueueName) {
    try {
      const queue = this.waitlistQueue;

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      return {
        name: queueName,
        waiting,
        active,
        completed,
        failed,
        delayed,
        isPaused: await queue.isPaused(),
      };
    } catch (error) {
      this.logger.error(`Failed to get queue health for ${queueName}`, error);
      throw error;
    }
  }

  async cleanQueue(queueName: QueueName, olderThanMs: number = 86400000) {
    try {
      const queue = this.waitlistQueue;
      await queue.clean(olderThanMs, 100, 'completed');
      await queue.clean(olderThanMs * 7, 100, 'failed');
      this.logger.log(`Cleaned queue: ${queueName}`);
    } catch (error) {
      this.logger.error(`Failed to clean queue ${queueName}`, error);
    }
  }
}
