import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { UserActivity } from 'src/entities/user-activity.entity';
import { AdminAnalyticsService } from './admin-analytics.service';
import { ActivityType } from '../user/enums/user.enums';

describe('AdminAnalyticsService', () => {
  let service: AdminAnalyticsService;
  let userRepo: any;
  let activityRepo: any;

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
      ],
    }).compile();

    service = module.get<AdminAnalyticsService>(AdminAnalyticsService);
    userRepo = module.get(getRepositoryToken(User));
    activityRepo = module.get(getRepositoryToken(UserActivity));
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
});
