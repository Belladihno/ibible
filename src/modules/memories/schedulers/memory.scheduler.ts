import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { Memory } from '../../../entities/memory.entity';
import { NotificationsAdapter } from '../notifications.adapter';

@Injectable()
export class MemoriesScheduler {
  private readonly logger = new Logger(MemoriesScheduler.name);

  constructor(
    @InjectRepository(Memory)
    private readonly memoryRepository: Repository<Memory>,
    private readonly notifications: NotificationsAdapter,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleFollowUpsAndAnniversaries() {
    const now = new Date();

    // Process due follow-ups (Using raw JSONB queries or loading in memory if easier. For now, let's load relevant candidates)
    // JSONB querying in TypeORM varies by DB. For Postgres we can use raw query builder or extensive checks
    // But since followUp is inside a JSONB column, simple find might strict without customization
    // Simplest approach for migration: Fetched likely candidates or just use QueryBuilder

    // Postgres JSONB query: find where followUp->scheduledAt <= now AND followUp->isCompleted = false
    const dueFollowUps = await this.memoryRepository
      .createQueryBuilder('memory')
      .where("memory.followUp->>'scheduledAt' <= :now", {
        now: now.toISOString(),
      })
      .andWhere("memory.followUp->>'isCompleted' = :isCompleted", {
        isCompleted: 'false',
      }) // JSON boolean is stored as text 'true'/'false' in some cases or direct bool
      .getMany();

    for (const memory of dueFollowUps) {
      await this.notifications.sendFollowUpReminder(memory);
    }

    // Process anniversaries (memories created on this date in previous years)
    // We need to extract month and day from createdAt
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();

    // Postgres: EXTRACT(MONTH FROM "createdAt") = :month AND EXTRACT(DAY FROM "createdAt") = :day AND EXTRACT(YEAR FROM "createdAt") < :year
    const anniversaries = await this.memoryRepository
      .createQueryBuilder('memory')
      .where('EXTRACT(MONTH FROM "createdAt") = :month', {
        month: currentMonth,
      })
      .andWhere('EXTRACT(DAY FROM "createdAt") = :day', { day: currentDay })
      .andWhere('EXTRACT(YEAR FROM "createdAt") < :year', {
        year: now.getFullYear(),
      })
      .getMany();

    for (const memory of anniversaries) {
      await this.notifications.sendAnniversaryAlert(memory);
    }

    this.logger.log(
      `Processed ${dueFollowUps.length} follow-ups and ${anniversaries.length} anniversaries.`,
    );
  }
}
