import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { UserActivity } from 'src/entities/user-activity.entity';
import { AppMetric } from 'src/entities/app-metric.entity';
import { AdminAnalyticsService } from './admin-analytics.service';
import { ActivityType } from '../user/enums/user.enums';

describe('AdminAnalyticsService', () => {
  let service: AdminAnalyticsService;
  let userRepo: any;
  let activityRepo: any;
  let appMetricRepo: any;

  beforeEach(async () => {
    const mockUserRepo = {
      count: jest.fn(),
      findAndCount: jest.fn(),
    };

    const mockActivityRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
        getRawMany: jest.fn(),
      }),
    };

    const mockAppMetricRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
        getRawMany: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAnalyticsService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(UserActivity),
          useValue: mockActivityRepo,
        },
        {
          provide: getRepositoryToken(AppMetric),
          useValue: mockAppMetricRepo,
        },
      ],
    }).compile();

    service = module.get<AdminAnalyticsService>(AdminAnalyticsService);
    userRepo = module.get(getRepositoryToken(User));
    activityRepo = module.get(getRepositoryToken(UserActivity));
    appMetricRepo = module.get(getRepositoryToken(AppMetric));
  });

  describe('getOverviewStats', () => {
    it('should calculate Period-over-Period data correctly', async () => {
      // Mock userRepo.count calls: total, totalPrev, new, newPrev
      userRepo.count.mockResolvedValueOnce(100); // total now
      userRepo.count.mockResolvedValueOnce(90); // total 30d ago
      userRepo.count.mockResolvedValueOnce(10); // new last 30d
      userRepo.count.mockResolvedValueOnce(5); // new prev 30d

      const queryBuilder = activityRepo.createQueryBuilder();
      // Mock activityRepo calls: active last 30d, active prev 30d
      (queryBuilder.getRawOne as jest.Mock)
        .mockResolvedValueOnce({ count: '50' })
        .mockResolvedValueOnce({ count: '40' });

      // Mock revenue queries to return 0 (no data)
      appMetricRepo.createQueryBuilder
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total_revenue: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total_revenue: null }),
        });

      const result = await service.getOverviewStats();

      // Total: (100-90)/90 = 11%
      expect(result.totalUsers.value).toBe(100);
      expect(result.totalUsers.change).toBe(11);

      // New: (10-5)/5 = 100%
      expect(result.newUsers.value).toBe(10);
      expect(result.newUsers.change).toBe(100);

      // Active: (50-40)/40 = 25%
      expect(result.activeUsers.value).toBe(50);
      expect(result.activeUsers.change).toBe(25);

      // Revenue should be 0 with no change
      expect(result.revenue.value).toBe(0);
      expect(result.revenue.change).toBe(0);
    });
  });

  describe('getUserAnalytics', () => {
    it('should return users with activity metrics', async () => {
      const mockUsers = [
        {
          id: '1',
          fullName: 'User 1',
          email: 'u1@e.com',
          createdAt: new Date(),
        },
      ];
      userRepo.findAndCount.mockResolvedValue([mockUsers as any, 1]);
      activityRepo.findOne.mockResolvedValue({
        createdAt: new Date(),
      } as unknown as UserActivity);

      const queryBuilder = activityRepo.createQueryBuilder();
      (queryBuilder.getRawOne as jest.Mock).mockResolvedValue({
        total_duration: '3660',
      });

      const result = await service.getUserAnalytics(1, 10);

      expect(result.meta.total).toBe(1);
      expect(result.data[0].activityLength).toBe('1h 1m');
    });
  });

  describe('getUsageTrends', () => {
    it('should return usage trends from repository', async () => {
      const mockTrends = [{ feature: 'meditation', count: '5' }];
      const queryBuilder = activityRepo.createQueryBuilder();
      (queryBuilder.getRawMany as jest.Mock).mockResolvedValue(mockTrends);

      const result = await service.getUsageTrends();

      expect(result).toEqual(mockTrends);
      expect(queryBuilder.groupBy).toHaveBeenCalledWith('activity.featureName');
    });
  });

  describe('getOverviewStats with revenue', () => {
    it('should include revenue calculations', async () => {
      // Mock user and activity data
      userRepo.count.mockResolvedValueOnce(100);
      userRepo.count.mockResolvedValueOnce(90);
      userRepo.count.mockResolvedValueOnce(10);
      userRepo.count.mockResolvedValueOnce(5);

      const activityQueryBuilder = activityRepo.createQueryBuilder();
      (activityQueryBuilder.getRawOne as jest.Mock)
        .mockResolvedValueOnce({ count: '50' })
        .mockResolvedValueOnce({ count: '40' });

      // Mock revenue queries - set up different return values for consecutive calls
      appMetricRepo.createQueryBuilder
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total_revenue: '15420.50' }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total_revenue: '13500.00' }),
        });

      const result = await service.getOverviewStats();

      expect(result.revenue.value).toBe(15420.5);
      expect(result.revenue.change).toBe(14); // (15420.50 - 13500) / 13500 * 100 ≈ 14%
    });
  });

  describe('getGrowthMetrics', () => {
    it('should return growth metrics for the specified period', async () => {
      const mockMetrics = [
        {
          date: '2025-12-01',
          ios_downloads: '150',
          android_downloads: '95',
          ios_uninstalls: '15',
          android_uninstalls: '8',
        },
      ];

      // Set up the mock for getGrowthMetrics test
      appMetricRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockMetrics),
      });

      const result = await service.getGrowthMetrics('week');

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2025-12-01');
      expect(result[0].downloads).toBe(245); // 150 + 95
      expect(result[0].uninstalls).toBe(23); // 15 + 8
      expect(result[0].ios.downloads).toBe(150);
      expect(result[0].android.downloads).toBe(95);
    });
  });
});
