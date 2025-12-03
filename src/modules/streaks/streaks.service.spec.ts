import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StreaksService } from './streaks.service';
import { UserStreak } from 'src/entities/user-streak.entity';
import { StreakActivity } from 'src/entities/streak-activity.entity';

describe('StreaksService', () => {
  let service: StreaksService;
  let streakRepo: any;
  let activityRepo: any;

  const mockStreakRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockActivityRepo = {
    find: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreaksService,
        { provide: getRepositoryToken(UserStreak), useValue: mockStreakRepo },
        {
          provide: getRepositoryToken(StreakActivity),
          useValue: mockActivityRepo,
        },
      ],
    }).compile();

    service = module.get<StreaksService>(StreaksService);
    streakRepo = module.get(getRepositoryToken(UserStreak));
    activityRepo = module.get(getRepositoryToken(StreakActivity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStreak', () => {
    it('should create streak record if user has none', async () => {
      streakRepo.findOne.mockResolvedValue(null);
      activityRepo.findOne.mockResolvedValue(null);
      streakRepo.save.mockResolvedValue({
        userId: '123',
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: service['getToday'](),
        totalDays: 0,
      });

      const result = await service.getStreak('123');

      expect(result.currentStreak).toBe(0);
      expect(result.lastActivityType).toBeNull();
      expect(streakRepo.save).toHaveBeenCalled();
    });

    it('should return streak with isActive=true when lastActiveDate is today', async () => {
      const today = service['getToday']();

      streakRepo.findOne.mockResolvedValue({
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: today,
        totalDays: 20,
      });

      activityRepo.findOne.mockResolvedValue({
        activityType: 'app_open',
      });

      const result = await service.getStreak('123');

      expect(result.isActive).toBe(true);
      expect(result.currentStreak).toBe(5);
      expect(result.lastActivityType).toBe('app_open');
    });

    it('should return isActive=false when lastActiveDate is more than 1 day ago', async () => {
      streakRepo.findOne.mockResolvedValue({
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: '2024-01-01',
        totalDays: 20,
      });

      activityRepo.findOne.mockResolvedValue(null);

      const result = await service.getStreak('123');

      expect(result.isActive).toBe(false);
      expect(result.currentStreak).toBe(0);
    });
  });

  describe('updateStreak', () => {
    it('should create activity and return activityType', async () => {
      const today = service['getToday']();

      activityRepo.save.mockResolvedValue({});

      streakRepo.findOne.mockResolvedValue({
        userId: '123',
        currentStreak: 3,
        longestStreak: 5,
        lastActiveDate: today,
        totalDays: 10,
      });

      streakRepo.save.mockResolvedValue({});

      const result = await service['updateStreak']('123', 'app_open');

      expect(result.currentStreak).toBe(3); // same day does not increment
      expect(result.activityType).toBe('app_open');
      expect(activityRepo.save).toHaveBeenCalled();
    });

    it('should reset streak when days difference is more than 1', async () => {
      activityRepo.save.mockResolvedValue({});

      streakRepo.findOne.mockResolvedValue({
        userId: '123',
        currentStreak: 4,
        longestStreak: 10,
        lastActiveDate: '2024-01-01', // far in the past
        totalDays: 20,
      });

      streakRepo.save.mockResolvedValue({});

      const result = await service['updateStreak']('123', 'app_open');

      expect(result.currentStreak).toBe(1);
      expect(result.activityType).toBe('app_open');
      expect(result.streakBroken).toBe(true);
    });

    it('should return current streak with activityType if activity already logged today', async () => {
      activityRepo.save.mockRejectedValue({ code: '23505' });
      activityRepo.findOne.mockResolvedValue({
        activityType: 'app_open',
      });

      streakRepo.findOne.mockResolvedValue({
        currentStreak: 7,
        longestStreak: 9,
        lastActiveDate: service['getToday'](),
        totalDays: 20,
      });

      const result = await service['updateStreak']('123', 'app_open');

      expect(result.currentStreak).toBe(7);
      expect(result.activityType).toBe('app_open');
    });

    it('should increment streak for consecutive day', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      activityRepo.save.mockResolvedValue({});

      streakRepo.findOne.mockResolvedValue({
        userId: '123',
        currentStreak: 3,
        longestStreak: 5,
        lastActiveDate: yesterdayStr,
        totalDays: 10,
      });

      streakRepo.save.mockResolvedValue({});

      const result = await service['updateStreak']('123', 'reading');

      expect(result.currentStreak).toBe(4);
      expect(result.activityType).toBe('reading');
    });

    it('should create new streak for first time user', async () => {
      activityRepo.save.mockResolvedValue({});
      streakRepo.findOne.mockResolvedValue(null);
      streakRepo.save.mockResolvedValue({
        userId: '123',
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: service['getToday'](),
        totalDays: 1,
      });

      const result = await service['updateStreak']('123', 'app_open');

      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
      expect(result.activityType).toBe('app_open');
    });
  });

  describe('ping', () => {
    it('should call updateStreak with app_open', async () => {
      const updateStreakSpy = jest
        .spyOn(service as any, 'updateStreak')
        .mockResolvedValue({
          currentStreak: 1,
          longestStreak: 1,
          totalDays: 1,
          activityType: 'app_open',
        });

      const result = await service.ping('123');

      expect(updateStreakSpy).toHaveBeenCalledWith('123', 'app_open');
      expect(result.activityType).toBe('app_open');
    });
  });

  describe('logActivity', () => {
    it('should call updateStreak with provided activity type', async () => {
      const updateStreakSpy = jest
        .spyOn(service as any, 'updateStreak')
        .mockResolvedValue({
          currentStreak: 2,
          longestStreak: 2,
          totalDays: 2,
          activityType: 'prayer',
        });

      const result = await service.logActivity('123', 'prayer');

      expect(updateStreakSpy).toHaveBeenCalledWith('123', 'prayer');
      expect(result.activityType).toBe('prayer');
    });
  });

  describe('getHistory', () => {
    it('should return calendar history', async () => {
      activityRepo.find.mockResolvedValue([
        { activityDate: service['getToday']() },
      ]);

      const result = await service.getHistory('123', 7);

      expect(result.length).toBe(7);
      expect(result[6].hasActivity).toBe(true); // last day is today
    });

    it('should return correct activity count per day', async () => {
      const today = service['getToday']();
      activityRepo.find.mockResolvedValue([
        { activityDate: today },
        { activityDate: today },
        { activityDate: today },
      ]);

      const result = await service.getHistory('123', 7);

      expect(result[6].activityCount).toBe(3);
    });
  });

  describe('getActivities', () => {
    it('should return recent activities', async () => {
      activityRepo.find.mockResolvedValue([{ activityType: 'app_open' }]);

      const result = await service.getActivities('123', 10);

      expect(result.length).toBe(1);
    });

    it('should respect limit parameter', async () => {
      activityRepo.find.mockResolvedValue([
        { activityType: 'app_open' },
        { activityType: 'reading' },
      ]);

      await service.getActivities('123', 5);

      expect(activityRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  describe('getActivitiesByDate', () => {
    it('should return activities for specific date', async () => {
      const testDate = '2025-12-03';
      activityRepo.find.mockResolvedValue([
        {
          activityType: 'app_open',
          createdAt: new Date('2025-12-03T08:00:00Z'),
        },
        {
          activityType: 'prayer',
          createdAt: new Date('2025-12-03T09:00:00Z'),
        },
      ]);

      const result = await service.getActivitiesByDate('123', testDate);

      expect(result.date).toBe(testDate);
      expect(result.activityCount).toBe(2);
      expect(result.activities).toHaveLength(2);
      expect(result.activities[0].type).toBe('app_open');
    });

    it('should throw error for invalid date format', async () => {
      await expect(
        service.getActivitiesByDate('123', 'invalid-date'),
      ).rejects.toThrow('Invalid date format. Use YYYY-MM-DD');
    });

    it('should return empty activities for date with no activities', async () => {
      activityRepo.find.mockResolvedValue([]);

      const result = await service.getActivitiesByDate('123', '2025-12-03');

      expect(result.activityCount).toBe(0);
      expect(result.activities).toHaveLength(0);
    });
  });
});
