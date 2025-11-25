/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { MeditationController } from './meditation.controller';
import { MeditationService } from './meditation.service';
import { AuthGuard } from 'src/guards/auth.guard';

describe('MeditationController', () => {
  let controller: MeditationController;
  let service: MeditationService;

  const mockUserId = 'user-123';
  const mockRequest = {
    user: { sub: mockUserId },
  };

  const mockMeditationService = {
    getDailyMeditation: jest.fn(),
    startSession: jest.fn(),
    completeSession: jest.fn(),
    getHistory: jest.fn(),
    updatePreferences: jest.fn(),
    getStreak: jest.fn(),
    getStatistics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeditationController],
      providers: [
        {
          provide: MeditationService,
          useValue: mockMeditationService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<MeditationController>(MeditationController);
    service = module.get<MeditationService>(MeditationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDailyMeditation', () => {
    it('should call service with userId', async () => {
      const mockResult = {
        plan: {
          morningTime: '06:00:00',
          eveningTime: '20:00:00',
          morningEnabled: true,
          eveningEnabled: false,
          durationMinutes: 10,
        },
        verse: {
          reference: 'Psalm 46:10',
          text: 'Be still, and know that I am God.',
        },
        todayCompleted: false,
        completedSessions: 0,
        streak: 0,
      };

      jest.spyOn(service, 'getDailyMeditation').mockResolvedValue(mockResult);

      const result = await controller.getDailyMeditation(mockRequest);

      expect(service.getDailyMeditation).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockResult);
    });
  });

  describe('startSession', () => {
    it('should call service with userId and dto', async () => {
      const dto = { sessionType: 'morning' };
      const mockResult = {
        sessionId: 'session-123',
        startedAt: new Date(),
        durationMinutes: 10,
        verse: {
          reference: 'Psalm 46:10',
          text: 'Be still, and know that I am God.',
        },
      };

      jest.spyOn(service, 'startSession').mockResolvedValue(mockResult);

      const result = await controller.startSession(mockRequest, dto);

      expect(service.startSession).toHaveBeenCalledWith(mockUserId, dto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('completeSession', () => {
    it('should call service with userId and dto', async () => {
      const dto = { sessionId: 'session-123' };
      const mockResult = {
        message: 'Session completed successfully',
        sessionId: 'session-123',
        completedAt: new Date(),
        durationSeconds: 600,
        streak: 1,
      };

      jest.spyOn(service, 'completeSession').mockResolvedValue(mockResult);

      const result = await controller.completeSession(mockRequest, dto);

      expect(service.completeSession).toHaveBeenCalledWith(mockUserId, dto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getHistory', () => {
    it('should call service with userId and query params', async () => {
      const dto = { page: 1, limit: 20 };
      const mockResult = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      jest.spyOn(service, 'getHistory').mockResolvedValue(mockResult);

      const result = await controller.getHistory(mockRequest, dto);

      expect(service.getHistory).toHaveBeenCalledWith(mockUserId, dto);
      expect(result).toEqual(mockResult);
    });

    it('should handle date range filters', async () => {
      const dto = {
        page: 1,
        limit: 20,
        startDate: '2025-11-01',
        endDate: '2025-11-30',
      };
      const mockResult = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      jest.spyOn(service, 'getHistory').mockResolvedValue(mockResult);

      const result = await controller.getHistory(mockRequest, dto);

      expect(service.getHistory).toHaveBeenCalledWith(mockUserId, dto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('updatePreferences', () => {
    it('should call service with userId and dto', async () => {
      const dto = { durationMinutes: 15, morningEnabled: true };
      const mockResult = {
        id: 'plan-123',
        userId: mockUserId,
        morningTime: '06:00:00',
        eveningTime: '20:00:00',
        morningEnabled: true,
        eveningEnabled: false,
        durationMinutes: 15,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(service, 'updatePreferences')
        .mockResolvedValue(mockResult as any);

      const result = await controller.updatePreferences(mockRequest, dto);

      expect(service.updatePreferences).toHaveBeenCalledWith(mockUserId, dto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getStreak', () => {
    it('should call service with userId', async () => {
      const mockResult = {
        currentStreak: 5,
        longestStreak: 10,
        totalDays: 25,
      };

      jest.spyOn(service, 'getStreak').mockResolvedValue(mockResult);

      const result = await controller.getStreak(mockRequest);

      expect(service.getStreak).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getStatistics', () => {
    it('should call service with userId', async () => {
      const mockResult = {
        totalSessions: 50,
        totalDays: 25,
        totalDurationSeconds: 15000,
        averageDurationSeconds: 300,
        longestStreak: 10,
        last30Days: 20,
        currentStreak: 5,
      };

      jest.spyOn(service, 'getStatistics').mockResolvedValue(mockResult);

      const result = await controller.getStatistics(mockRequest);

      expect(service.getStatistics).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockResult);
    });
  });
});
