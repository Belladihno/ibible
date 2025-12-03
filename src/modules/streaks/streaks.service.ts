import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserStreak } from 'src/entities/user-streak.entity';
import { StreakActivity } from 'src/entities/streak-activity.entity';
import { Repository, Between } from 'typeorm';
import { CalendarDay } from 'src/shared/interfaces/calendar.interface';

@Injectable()
export class StreaksService {
  constructor(
    @InjectRepository(UserStreak)
    private streakRepo: Repository<UserStreak>,
    @InjectRepository(StreakActivity)
    private activityRepo: Repository<StreakActivity>,
  ) {}

  async ping(userId: string) {
    return this.updateStreak(userId, 'app_open');
  }

  async logActivity(userId: string, activityType: string) {
    return this.updateStreak(userId, activityType);
  }

  async getStreak(userId: string) {
    let streak = await this.streakRepo.findOne({ where: { userId } });

    if (!streak) {
      streak = await this.streakRepo.save({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: this.getToday(),
        totalDays: 0,
      });
    }

    // Check if streak is broken (but don't update until next activity)
    const daysSinceActive = this.getDaysDiff(
      streak.lastActiveDate,
      this.getToday(),
    );
    const isActive = daysSinceActive <= 1;

    const lastActivity = await this.activityRepo.findOne({
      where: { userId, activityDate: streak.lastActiveDate },
      order: { createdAt: 'DESC' },
    });

    return {
      currentStreak: isActive ? streak.currentStreak : 0,
      longestStreak: streak.longestStreak,
      totalDays: streak.totalDays,
      lastActiveDate: streak.lastActiveDate,
      lastActivityType: lastActivity?.activityType || null,
      isActive,
    };
  }

  // GET /api/streak/history - Get calendar view
  async getHistory(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await this.activityRepo.find({
      where: {
        userId,
        activityDate: Between(
          startDate.toISOString().split('T')[0],
          this.getToday(),
        ),
      },
      order: { activityDate: 'DESC' },
    });

    // Group by date
    const calendar: CalendarDay[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayActivities = activities.filter(
        (a) => a.activityDate === dateStr,
      );

      calendar.push({
        date: dateStr,
        hasActivity: dayActivities.length > 0,
        activityCount: dayActivities.length,
      });
    }

    return calendar.reverse();
  }

  // Get activities for specific day
  async getActivitiesByDate(userId: string, date: string) {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }

    const activities = await this.activityRepo.find({
      where: {
        userId,
        activityDate: date,
      },
      order: { createdAt: 'ASC' },
    });

    return {
      date,
      activityCount: activities.length,
      activities: activities.map((activity) => ({
        type: activity.activityType,
        timestamp: activity.createdAt,
      })),
    };
  }
  async getActivities(userId: string, limit: number = 50) {
    return this.activityRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // Core logic - updates streak
  private async updateStreak(userId: string, activityType: string) {
    const today = this.getToday();

    // Try to log activity (will fail if duplicate)
    try {
      await this.activityRepo.save({
        userId,
        activityType,
        activityDate: today,
      });
    } catch (error) {
      // Already logged today, just return current streak
      if (error.code === '23505') {
        const streakData = await this.getStreak(userId);
        return { ...streakData, activityType };
      }
      throw error;
    }

    // Get or create streak record
    let streak = await this.streakRepo.findOne({ where: { userId } });

    if (!streak) {
      streak = await this.streakRepo.save({
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: today,
        totalDays: 1,
      });
      return { currentStreak: 1, longestStreak: 1, totalDays: 1, activityType };
    }

    // Calculate days difference
    const daysDiff = this.getDaysDiff(streak.lastActiveDate, today);

    if (daysDiff === 0) {
      // Same day, no change
      return {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        totalDays: streak.totalDays,
        activityType,
      };
    } else if (daysDiff === 1) {
      // Consecutive day, increment
      streak.currentStreak += 1;
      streak.totalDays += 1;
      streak.lastActiveDate = today;

      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }
    } else {
      // Streak broken, reset
      streak.currentStreak = 1;
      streak.totalDays += 1;
      streak.lastActiveDate = today;
    }

    await this.streakRepo.save(streak);

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalDays: streak.totalDays,
      streakBroken: daysDiff > 1,
      activityType,
    };
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getDaysDiff(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  }
}
