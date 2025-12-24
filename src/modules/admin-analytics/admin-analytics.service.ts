import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThan, Between } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { UserActivity } from 'src/entities/user-activity.entity';
import { AppMetric } from 'src/entities/app-metric.entity';
import { ActivityType } from '../user/enums/user.enums';

@Injectable()
export class AdminAnalyticsService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserActivity)
    private activityRepo: Repository<UserActivity>,
    @InjectRepository(AppMetric)
    private appMetricRepo: Repository<AppMetric>,
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

    // Calculate revenue from app metrics (last 30 days)
    const revenueResult = await this.appMetricRepo
      .createQueryBuilder('metric')
      .select('SUM(metric.revenue)', 'total_revenue')
      .where('metric.date >= :startDate', {
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
      })
      .andWhere('metric.date <= :endDate', {
        endDate: now.toISOString().split('T')[0],
      })
      .getRawOne();

    const totalRevenue = parseFloat(
      (revenueResult as { total_revenue: string }).total_revenue || '0',
    );

    // Calculate revenue for previous 30 days
    const revenuePreviousResult = await this.appMetricRepo
      .createQueryBuilder('metric')
      .select('SUM(metric.revenue)', 'total_revenue')
      .where('metric.date >= :startDate', {
        startDate: sixtyDaysAgo.toISOString().split('T')[0],
      })
      .andWhere('metric.date < :endDate', {
        endDate: thirtyDaysAgo.toISOString().split('T')[0],
      })
      .getRawOne();

    const totalRevenuePrevious = parseFloat(
      (revenuePreviousResult as { total_revenue: string }).total_revenue || '0',
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
      revenue: {
        value: totalRevenue,
        change: calculateChange(totalRevenue, totalRevenuePrevious),
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

  async getGrowthMetrics(period: 'week' | 'month' = 'week') {
    const now = new Date();
    const days = period === 'week' ? 7 : 30;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const metrics = await this.appMetricRepo
      .createQueryBuilder('metric')
      .select('metric.date', 'date')
      .addSelect(
        "SUM(CASE WHEN metric.platform = 'ios' THEN metric.downloads ELSE 0 END)",
        'ios_downloads',
      )
      .addSelect(
        "SUM(CASE WHEN metric.platform = 'android' THEN metric.downloads ELSE 0 END)",
        'android_downloads',
      )
      .addSelect(
        "SUM(CASE WHEN metric.platform = 'ios' THEN metric.uninstalls ELSE 0 END)",
        'ios_uninstalls',
      )
      .addSelect(
        "SUM(CASE WHEN metric.platform = 'android' THEN metric.uninstalls ELSE 0 END)",
        'android_uninstalls',
      )
      .where('metric.date >= :startDate', {
        startDate: startDate.toISOString().split('T')[0],
      })
      .groupBy('metric.date')
      .orderBy('metric.date', 'ASC')
      .getRawMany();

    return metrics.map((row: any) => ({
      date: String(row.date),
      downloads:
        parseInt(String(row.ios_downloads || '0')) +
        parseInt(String(row.android_downloads || '0')),
      uninstalls:
        parseInt(String(row.ios_uninstalls || '0')) +
        parseInt(String(row.android_uninstalls || '0')),
      ios: {
        downloads: parseInt(String(row.ios_downloads || '0')),
        uninstalls: parseInt(String(row.ios_uninstalls || '0')),
      },
      android: {
        downloads: parseInt(String(row.android_downloads || '0')),
        uninstalls: parseInt(String(row.android_uninstalls || '0')),
      },
    }));
  }
}
