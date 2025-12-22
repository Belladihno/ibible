import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThan, Between } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { UserActivity } from 'src/entities/user-activity.entity';
import { ActivityType } from '../user/enums/user.enums';

@Injectable()
export class AdminAnalyticsService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserActivity)
    private activityRepo: Repository<UserActivity>,
  ) {}

  async getOverviewStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Fetch counts for current and previous 30-day windows
    const [
      totalUsers,
      totalUsersPrevious,
      newUsers,
      newUsersPrevious,
      activeUsersRaw,
      activeUsersPreviousRaw,
    ] = await Promise.all([
      // Total Users Now
      this.userRepo.count(),
      // Total Users as of 30 days ago
      this.userRepo.count({
        where: { createdAt: LessThan(thirtyDaysAgo) },
      }),
      // New Users (Last 30 days)
      this.userRepo.count({
        where: { createdAt: MoreThanOrEqual(thirtyDaysAgo) },
      }),
      // New Users (Previous 30 days: 60d to 30d ago)
      this.userRepo.count({
        where: {
          createdAt: Between(sixtyDaysAgo, thirtyDaysAgo),
        },
      }),
      // Active Users (Last 30 days)
      this.activityRepo
        .createQueryBuilder('activity')
        .select('COUNT(DISTINCT activity.userId)', 'count')
        .where('activity.createdAt >= :date', { date: thirtyDaysAgo })
        .getRawOne(),
      // Active Users (Previous 30 days)
      this.activityRepo
        .createQueryBuilder('activity')
        .select('COUNT(DISTINCT activity.userId)', 'count')
        .where('activity.createdAt >= :start AND activity.createdAt < :end', {
          start: sixtyDaysAgo,
          end: thirtyDaysAgo,
        })
        .getRawOne(),
    ]);

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const activeUsersCount = parseInt(
      (activeUsersRaw as { count: string }).count || '0',
    );
    const activeUsersPreviousCount = parseInt(
      (activeUsersPreviousRaw as { count: string }).count || '0',
    );

    const data = {
      totalUsers: {
        value: totalUsers,
        change: calculateChange(totalUsers, totalUsersPrevious),
      },
      newUsers: {
        value: newUsers,
        change: calculateChange(newUsers, newUsersPrevious),
      },
      activeUsers: {
        value: activeUsersCount,
        change: calculateChange(activeUsersCount, activeUsersPreviousCount),
      },
    };

    return data;
  }

  async getUserAnalytics(page: number, limit: number) {
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 ? limit : 10;

    const [users, total] = await this.userRepo.findAndCount({
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      order: { createdAt: 'DESC' },
    });

    // Decorate users with activity metrics
    const userAnalytics = await Promise.all(
      users.map(async (user) => {
        const lastLogin = await this.activityRepo.findOne({
          where: { userId: user.id, eventType: ActivityType.LOGIN },
          order: { createdAt: 'DESC' },
        });

        const activityLengthRaw = await this.activityRepo
          .createQueryBuilder('activity')
          .select('SUM(activity.duration)', 'total_duration')
          .where('activity.userId = :userId', { userId: user.id })
          .andWhere('activity.eventType = :type', {
            type: ActivityType.LOGOUT,
          })
          .getRawOne();

        const totalSeconds = parseInt(
          (activityLengthRaw as { total_duration: string }).total_duration ||
            '0',
        );
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        return {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          profilePicture: user.profilePicture,
          subscriptionTier: user.subscriptionTier,
          lastLogin: lastLogin?.createdAt || user.lastActiveAt,
          activityLength: `${hours}h ${minutes}m`,
          createdAt: user.createdAt,
        };
      }),
    );

    return {
      data: userAnalytics,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getUsageTrends() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const usageTrends = await this.activityRepo
      .createQueryBuilder('activity')
      .select('activity.featureName', 'feature')
      .addSelect('COUNT(*)', 'count')
      .where('activity.eventType = :type', {
        type: ActivityType.FEATURE_USAGE,
      })
      .andWhere('activity.createdAt >= :date', { date: sevenDaysAgo })
      .groupBy('activity.featureName')
      .orderBy('count', 'DESC')
      .getRawMany();

    return usageTrends as { feature: string; count: string }[];
  }
}
