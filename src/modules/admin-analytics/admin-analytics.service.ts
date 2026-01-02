import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThan, Between } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { UserActivity } from 'src/entities/user-activity.entity';
import { AppMetric } from 'src/entities/app-metric.entity';
import { AiUsageLog } from 'src/entities/ai-usage-log.entity';
import { ActivityType, SubscriptionTier } from '../user/enums/user.enums';
import { GeminiService } from '../gemini/gemini.service';

@Injectable()
export class AdminAnalyticsService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserActivity)
    private activityRepo: Repository<UserActivity>,
    @InjectRepository(AppMetric)
    private appMetricRepo: Repository<AppMetric>,
    @InjectRepository(AiUsageLog)
    private aiUsageRepo: Repository<AiUsageLog>,
    private geminiService: GeminiService,
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

  // AI Usage Analytics
  async getAiUsageOverview() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total cost and tokens (last 30 days)
    const overviewResult = (await this.aiUsageRepo
      .createQueryBuilder('log')
      .select('SUM(log.cost)', 'totalCost')
      .addSelect('SUM(log.inputTokens)', 'totalInputTokens')
      .addSelect('SUM(log.outputTokens)', 'totalOutputTokens')
      .addSelect('SUM(log.totalTokens)', 'totalTokens')
      .addSelect('COUNT(*)', 'totalRequests')
      .where('log.createdAt >= :startDate', { startDate: thirtyDaysAgo })
      .getRawOne()) as {
      totalCost: string;
      totalInputTokens: string;
      totalOutputTokens: string;
      totalTokens: string;
      totalRequests: string;
    };

    // Breakdown by feature
    const byFeature = await this.aiUsageRepo
      .createQueryBuilder('log')
      .select('log.feature', 'feature')
      .addSelect('SUM(log.cost)', 'cost')
      .addSelect('SUM(log.totalTokens)', 'tokens')
      .addSelect('COUNT(*)', 'requests')
      .where('log.createdAt >= :startDate', { startDate: thirtyDaysAgo })
      .groupBy('log.feature')
      .orderBy('SUM(log.cost)', 'DESC')
      .getRawMany();

    // Breakdown by model
    const byModel = await this.aiUsageRepo
      .createQueryBuilder('log')
      .select('log.model', 'model')
      .addSelect('SUM(log.cost)', 'cost')
      .addSelect('SUM(log.totalTokens)', 'tokens')
      .addSelect('COUNT(*)', 'requests')
      .where('log.createdAt >= :startDate', { startDate: thirtyDaysAgo })
      .groupBy('log.model')
      .orderBy('SUM(log.cost)', 'DESC')
      .getRawMany();

    return {
      overview: {
        totalCost: parseFloat(overviewResult?.totalCost || '0'),
        totalInputTokens: parseInt(overviewResult?.totalInputTokens || '0'),
        totalOutputTokens: parseInt(overviewResult?.totalOutputTokens || '0'),
        totalTokens: parseInt(overviewResult?.totalTokens || '0'),
        totalRequests: parseInt(overviewResult?.totalRequests || '0'),
      },
      byFeature: (byFeature || []).map(
        (row: {
          feature: string;
          cost: string;
          tokens: string;
          requests: string;
        }) => ({
          feature: row.feature,
          cost: parseFloat(row.cost || '0'),
          tokens: parseInt(row.tokens || '0'),
          requests: parseInt(row.requests || '0'),
        }),
      ),
      byModel: (byModel || []).map(
        (row: {
          model: string;
          cost: string;
          tokens: string;
          requests: string;
        }) => ({
          model: row.model,
          cost: parseFloat(row.cost || '0'),
          tokens: parseInt(row.tokens || '0'),
          requests: parseInt(row.requests || '0'),
        }),
      ),
    };
  }

  async getUserAiUsage(userId: string) {
    const logs = await this.aiUsageRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    const totalCost = logs.reduce((sum, log) => sum + Number(log.cost), 0);
    const totalTokens = logs.reduce((sum, log) => sum + log.totalTokens, 0);

    return {
      userId,
      totalCost,
      totalTokens,
      totalRequests: logs.length,
      recentLogs: logs.slice(0, 20).map((log) => ({
        id: log.id,
        feature: log.feature,
        model: log.model,
        inputTokens: log.inputTokens,
        outputTokens: log.outputTokens,
        cost: Number(log.cost),
        createdAt: log.createdAt,
      })),
    };
  }

  // AI Usage Timeline (for Credit Consumption Chart)
  async getAiUsageTimeline(period: 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    let startDate: Date;
    let groupByFormat: string;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupByFormat = 'YYYY-MM-DD';
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        groupByFormat = 'YYYY-MM';
        break;
      case 'month':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupByFormat = 'YYYY-MM-DD';
        break;
    }

    const timeline = await this.aiUsageRepo
      .createQueryBuilder('log')
      .select(`TO_CHAR(log.createdAt, '${groupByFormat}')`, 'period')
      .addSelect('SUM(log.cost)', 'cost')
      .addSelect('SUM(log.totalTokens)', 'tokens')
      .addSelect('COUNT(*)', 'requests')
      .where('log.createdAt >= :startDate', { startDate })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    return (timeline || []).map(
      (row: {
        period: string;
        cost: string;
        tokens: string;
        requests: string;
      }) => ({
        period: row.period,
        cost: parseFloat(row.cost || '0'),
        tokens: parseInt(row.tokens || '0'),
        requests: parseInt(row.requests || '0'),
      }),
    );
  }

  // User Growth by Subscription Tier (for Free vs Paid Chart)
  async getUserGrowthByTier(period: 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    let startDate: Date;
    let groupByFormat: string;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupByFormat = 'YYYY-MM-DD';
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        groupByFormat = 'YYYY-MM';
        break;
      case 'month':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupByFormat = 'YYYY-MM-DD';
        break;
    }

    const growth = await this.userRepo
      .createQueryBuilder('user')
      .select(`TO_CHAR(user.createdAt, '${groupByFormat}')`, 'period')
      .addSelect('user.subscriptionTier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .where('user.createdAt >= :startDate', { startDate })
      .groupBy('period, user.subscriptionTier')
      .orderBy('period', 'ASC')
      .getRawMany();

    // Transform to chart-ready format
    const periodMap = new Map<string, { free: number; paid: number }>();

    (growth || []).forEach(
      (row: { period: string; tier: string; count: string }) => {
        const period = row.period;
        if (!periodMap.has(period)) {
          periodMap.set(period, { free: 0, paid: 0 });
        }
        const data = periodMap.get(period)!;
        const count = parseInt(row.count || '0');

        if ((row.tier as SubscriptionTier) === SubscriptionTier.FREE) {
          data.free += count;
        } else {
          data.paid += count;
        }
      },
    );

    return Array.from(periodMap.entries()).map(([period, data]) => ({
      period,
      free: data.free,
      paid: data.paid,
    }));
  }

  // Enhanced User Analytics (with AI usage and payment data)
  async getEnhancedUserAnalytics(page: number, limit: number) {
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 ? limit : 10;

    const [users, total] = await this.userRepo.findAndCount({
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      order: { createdAt: 'DESC' },
    });

    const userAnalytics = await Promise.all(
      users.map(async (user) => {
        // Get last login
        const lastLogin = await this.activityRepo.findOne({
          where: { userId: user.id, eventType: ActivityType.LOGIN },
          order: { createdAt: 'DESC' },
        });

        // Get total activity duration
        const activityDuration = await this.activityRepo
          .createQueryBuilder('activity')
          .select('SUM(activity.duration)', 'total')
          .where('activity.userId = :userId', { userId: user.id })
          .getRawOne();

        // Get AI usage stats
        const aiUsage = await this.aiUsageRepo
          .createQueryBuilder('log')
          .select('SUM(log.cost)', 'totalCost')
          .addSelect('SUM(log.totalTokens)', 'totalTokens')
          .where('log.userId = :userId', { userId: user.id })
          .getRawOne();

        // Calculate activity length
        const totalSeconds = parseInt(
          (activityDuration as { total: string })?.total || '0',
        );
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const activityLength = `${hours}h ${minutes}m`;

        return {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          profilePicture: user.profilePicture,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
          paymentStatus:
            user.subscriptionTier === SubscriptionTier.FREE ? 'Free' : 'Paid',
          lastLogin: lastLogin?.createdAt || null,
          activityLength,
          creditUsed: parseFloat(
            (aiUsage as { totalCost: string })?.totalCost || '0',
          ),
          tokensUsed: parseInt(
            (aiUsage as { totalTokens: string })?.totalTokens || '0',
          ),
          amountSpent: 0, // TODO: Calculate from payment/subscription records
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

  async getAvailableCredits() {
    try {
      const data = await this.geminiService.getCredits();

      const available = data.total_credits - data.total_usage;

      return {
        availableCredits: available,
        totalBudget: data.total_credits,
        usedCredits: data.total_usage,
        unit: 'USD',
      };
    } catch (error) {
      // Fallback if OpenRouter call fails
      return {
        availableCredits: 0,
        totalBudget: 0,
        usedCredits: 0,
        unit: 'USD',
        error: 'Failed to fetch credits from OpenRouter',
      };
    }
  }

  async exportDashboardReport() {
    // Logic to generate CSV/PDF would go here
    return {
      message: 'Dashboard report generation triggered',
      downloadUrl: '/exports/report-' + new Date().getTime() + '.csv',
    };
  }
}
