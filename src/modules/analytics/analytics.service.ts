import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserActivity } from 'src/entities/user-activity.entity';
import { ActivityType } from 'src/modules/user/enums/user.enums';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(UserActivity)
    private activityRepo: Repository<UserActivity>,
  ) {}

  async trackEvent(
    userId: string,
    eventType: ActivityType,
    featureName?: string,
    metadata?: any,
    duration?: number,
  ) {
    const activity = this.activityRepo.create({
      userId,
      eventType,
      featureName,
      metadata,
      duration,
    });
    return this.activityRepo.save(activity);
  }

  async getSessionDuration(userId: string): Promise<number | null> {
    // Logic to calculate session duration could be complex.
    // For now, we can find the last LOGIN event for this user.
    const lastLogin = await this.activityRepo.findOne({
      where: { userId, eventType: ActivityType.LOGIN },
      order: { createdAt: 'DESC' },
    });

    if (!lastLogin) return null;

    const duration = Math.floor(
      (Date.now() - lastLogin.createdAt.getTime()) / 1000,
    );
    return duration;
  }
}
