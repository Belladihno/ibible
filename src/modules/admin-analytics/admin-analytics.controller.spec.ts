import { Test, TestingModule } from '@nestjs/testing';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AppMetricsSyncService } from './app-metrics-sync.service';
import { UserRole } from '../user/enums/user.enums';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Reflector } from '@nestjs/core';

describe('AdminAnalyticsController', () => {
  let controller: AdminAnalyticsController;
  let service: any;

  beforeEach(async () => {
    const mockService = {
      getOverviewStats: jest.fn(),
      getEnhancedUserAnalytics: jest.fn(),
      getUsageTrends: jest.fn(),
      getUserGrowthByTier: jest.fn(),
      getAiUsageOverview: jest.fn(),
      getUserAiUsage: jest.fn(),
      getAiUsageTimeline: jest.fn(),
      getAvailableCredits: jest.fn(),
      exportDashboardReport: jest.fn(),
    };

    const mockAppMetricsSyncService = {
      manualSync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAnalyticsController],
      providers: [
        {
          provide: AdminAnalyticsService,
          useValue: mockService,
        },
        {
          provide: AppMetricsSyncService,
          useValue: mockAppMetricsSyncService,
        },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminAnalyticsController>(AdminAnalyticsController);
    service = module.get(AdminAnalyticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOverview', () => {
    it('should call service.getOverviewStats', async () => {
      await controller.getOverview();
      expect(service.getOverviewStats).toHaveBeenCalled();
    });
  });

  describe('getUsers', () => {
    it('should call service.getEnhancedUserAnalytics with defaults', async () => {
      await controller.getUsers('1', '10');
      expect(service.getEnhancedUserAnalytics).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('getUsage', () => {
    it('should call service.getUsageTrends and wrap it in an object', async () => {
      const mockTrends = [{ feature: 'test', count: '1' }];
      service.getUsageTrends.mockResolvedValue(mockTrends);

      const result = await controller.getUsage();

      expect(service.getUsageTrends).toHaveBeenCalled();
      expect(result).toEqual({ trends: mockTrends });
    });
  });
});
