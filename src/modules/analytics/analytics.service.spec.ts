import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserActivity } from 'src/entities/user-activity.entity';
import { AnalyticsService } from './analytics.service';
import { ActivityType } from '../user/enums/user.enums';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let activityRepo: any;

  beforeEach(async () => {
    const mockActivityRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(UserActivity),
          useValue: mockActivityRepo,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    activityRepo = module.get(getRepositoryToken(UserActivity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackEvent', () => {
    it('should create and save a new activity with metadata', async () => {
      const mockActivity = {
        id: '1',
        userId: 'user-1',
        eventType: ActivityType.FEATURE_USAGE,
        metadata: { key: 'value' },
      };
      activityRepo.create.mockReturnValue(
        mockActivity as unknown as UserActivity,
      );
      activityRepo.save.mockResolvedValue(
        mockActivity as unknown as UserActivity,
      );

      const result = await service.trackEvent(
        'user-1',
        ActivityType.FEATURE_USAGE,
        'test_feature',
        { key: 'value' },
      );

      expect(activityRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        eventType: ActivityType.FEATURE_USAGE,
        featureName: 'test_feature',
        metadata: { key: 'value' },
        duration: undefined,
      });
      expect(result).toEqual(mockActivity);
    });
  });

  describe('getSessionDuration', () => {
    it('should return null if no login event found', async () => {
      activityRepo.findOne.mockResolvedValue(null);
      const result = await service.getSessionDuration('user-1');
      expect(result).toBeNull();
    });

    it('should calculate duration between now and last login', async () => {
      const loginTime = new Date(Date.now() - 3600000); // 1 hour ago
      activityRepo.findOne.mockResolvedValue({
        createdAt: loginTime,
      } as unknown as UserActivity);

      const result = await service.getSessionDuration('user-1');

      // Expected duration is ~3600 seconds
      expect(result).toBeGreaterThanOrEqual(3600);
      expect(result).toBeLessThan(3610);
    });
  });
});
