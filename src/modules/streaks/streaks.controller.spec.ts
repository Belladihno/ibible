/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { StreaksController } from './streaks.controller';
import { StreaksService } from './streaks.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('StreaksController', () => {
  let controller: StreaksController;
  let service: StreaksService;

  const mockStreaksService = {
    ping: jest.fn(),
    logActivity: jest.fn(),
    getStreak: jest.fn(),
    getHistory: jest.fn(),
    getActivities: jest.fn(),
    getActivitiesByDate: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn((context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest();
      request.userId = 'test-user-id';
      return true;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StreaksController],
      providers: [
        {
          provide: StreaksService,
          useValue: mockStreaksService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<StreaksController>(StreaksController);
    service = module.get<StreaksService>(StreaksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ping', () => {
    it('should call service.ping with userId', async () => {
      const mockResult = {
        currentStreak: 1,
        longestStreak: 1,
        totalDays: 1,
        activityType: 'app_open',
      };

      mockStreaksService.ping.mockResolvedValue(mockResult);

      const result = await controller.ping('user123');

      expect(service.ping).toHaveBeenCalledWith('user123');
      expect(result).toEqual(mockResult);
    });
  });

  describe('logActivity', () => {
    it('should call service.logActivity with userId and type', async () => {
      const mockResult = {
        currentStreak: 2,
        longestStreak: 2,
        totalDays: 2,
        activityType: 'prayer',
      };

      mockStreaksService.logActivity.mockResolvedValue(mockResult);

      const result = await controller.logActivity('user123', 'prayer');

      expect(service.logActivity).toHaveBeenCalledWith('user123', 'prayer');
      expect(result).toEqual(mockResult);
    });

    it('should use default type "general" when type is not provided', async () => {
      const mockResult = {
        currentStreak: 1,
        longestStreak: 1,
        totalDays: 1,
        activityType: 'general',
      };

      mockStreaksService.logActivity.mockResolvedValue(mockResult);

      const result = await controller.logActivity('user123', undefined);

      expect(service.logActivity).toHaveBeenCalledWith('user123', 'general');
      expect(result).toEqual(mockResult);
    });
  });

  describe('getStreak', () => {
    it('should call service.getStreak with userId', async () => {
      const mockResult = {
        currentStreak: 5,
        longestStreak: 10,
        totalDays: 20,
        lastActiveDate: '2025-12-03',
        lastActivityType: 'app_open',
        isActive: true,
      };

      mockStreaksService.getStreak.mockResolvedValue(mockResult);

      const result = await controller.getStreak('user123');

      expect(service.getStreak).toHaveBeenCalledWith('user123');
      expect(result).toEqual(mockResult);
    });
  });

  describe('getActivitiesByDate', () => {
    it('should call service.getActivitiesByDate with userId and date', async () => {
      const mockResult = {
        date: '2025-12-03',
        activityCount: 3,
        activities: [
          {
            type: 'app_open',
            timestamp: new Date('2025-12-03T08:00:00Z'),
          },
          {
            type: 'prayer',
            timestamp: new Date('2025-12-03T09:00:00Z'),
          },
          {
            type: 'reading',
            timestamp: new Date('2025-12-03T10:00:00Z'),
          },
        ],
      };

      mockStreaksService.getActivitiesByDate.mockResolvedValue(mockResult);

      const result = await controller.getActivitiesByDate(
        'user123',
        '2025-12-03',
      );

      expect(service.getActivitiesByDate).toHaveBeenCalledWith(
        'user123',
        '2025-12-03',
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle dates with no activities', async () => {
      const mockResult = {
        date: '2025-12-01',
        activityCount: 0,
        activities: [],
      };

      mockStreaksService.getActivitiesByDate.mockResolvedValue(mockResult);

      const result = await controller.getActivitiesByDate(
        'user123',
        '2025-12-01',
      );

      expect(result.activityCount).toBe(0);
      expect(result.activities).toHaveLength(0);
    });
  });

  describe('getHistory', () => {
    it('should call service.getHistory with userId and days', async () => {
      const mockResult = [
        {
          date: '2025-12-03',
          hasActivity: true,
          activityCount: 2,
        },
        {
          date: '2025-12-02',
          hasActivity: false,
          activityCount: 0,
        },
      ];

      mockStreaksService.getHistory.mockResolvedValue(mockResult);

      const result = await controller.getHistory('user123', 7);

      expect(service.getHistory).toHaveBeenCalledWith('user123', 7);
      expect(result).toEqual(mockResult);
    });

    it('should use default days=30 when not provided', async () => {
      const mockResult = [];

      mockStreaksService.getHistory.mockResolvedValue(mockResult);

      await controller.getHistory('user123', undefined);

      expect(service.getHistory).toHaveBeenCalledWith('user123', 30);
    });
  });

  describe('getActivities', () => {
    it('should call service.getActivities with userId and limit', async () => {
      const mockResult = [
        {
          activityType: 'app_open',
          activityDate: '2025-12-03',
        },
        {
          activityType: 'prayer',
          activityDate: '2025-12-03',
        },
      ];

      mockStreaksService.getActivities.mockResolvedValue(mockResult);

      const result = await controller.getActivities('user123', 10);

      expect(service.getActivities).toHaveBeenCalledWith('user123', 10);
      expect(result).toEqual(mockResult);
    });

    it('should use default limit=50 when not provided', async () => {
      const mockResult = [];

      mockStreaksService.getActivities.mockResolvedValue(mockResult);

      await controller.getActivities('user123', undefined);

      expect(service.getActivities).toHaveBeenCalledWith('user123', 50);
    });
  });

  describe('Auth Guard', () => {
    it('should be protected by AuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', StreaksController);
      expect(guards).toBeDefined();
      expect(guards).toContain(AuthGuard);
    });
  });
});
