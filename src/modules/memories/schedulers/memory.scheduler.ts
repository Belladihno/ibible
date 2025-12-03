// modules/memories/schedulers/memories.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Memory, MemoryDocument } from '../schemas/memory.schema';
import { NotificationsAdapter } from '../notifications.adapter';

@Injectable()
export class MemoriesScheduler {
  private readonly logger = new Logger(MemoriesScheduler.name);

  constructor(
    @InjectModel(Memory.name)
    private readonly memoryModel: Model<MemoryDocument>,
    private readonly notifications: NotificationsAdapter,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleFollowUpsAndAnniversaries() {
    const now = new Date();

    // Process due follow-ups
    const dueFollowUps = await this.memoryModel.find({
      'followUp.scheduledAt': { $lte: now },
      'followUp.isCompleted': false,
    });

    for (const memory of dueFollowUps) {
      await this.notifications.sendFollowUpReminder(memory);
    }

    // Process anniversaries (memories created on this date in previous years)
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const anniversaries = await this.memoryModel.find({
      createdAt: {
        $gte: new Date(
          start.getFullYear() - 1,
          start.getMonth(),
          start.getDate(),
        ),
        $lt: end,
      },
    });

    for (const memory of anniversaries) {
      await this.notifications.sendAnniversaryAlert(memory);
    }

    this.logger.log(
      `Processed ${dueFollowUps.length} follow-ups and ${anniversaries.length} anniversaries.`,
    );
  }
}
