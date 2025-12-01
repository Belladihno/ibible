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
  const mockSessionId = 'session-123';
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
    sendChatMessage: jest.fn(), // Add new method
    getSessionById: jest.fn(), // Add new method
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
    it('should call service with userId and dto without initial reflection', async () => {
      const dto = { sessionType: 'morning' };
      const mockResult = {
        sessionId: 'session-123',
        startedAt: new Date(),
        durationMinutes: 10,
        verse: {
          reference: 'Psalm 46:10',
          text: 'Be still, and know that I am God.',
        },
        initialChatMessage: null,
      };

      jest.spyOn(service, 'startSession').mockResolvedValue(mockResult as any);

      const result = await controller.startSession(mockRequest, dto);

      expect(service.startSession).toHaveBeenCalledWith(mockUserId, dto);
      expect(result).toEqual(mockResult);
    });

    it('should call service with userId and dto with initial reflection', async () => {
      const dto = {
        sessionType: 'morning',
        initialReflection: 'This verse speaks to me deeply',
      };
      const mockResult = {
        sessionId: 'session-123',
        startedAt: new Date(),
        durationMinutes: 10,
        verse: {
          reference: 'Psalm 46:10',
          text: 'Be still, and know that I am God.',
        },
        initialChatMessage: 'Thank you for sharing your thoughts...',
      };

      jest.spyOn(service, 'startSession').mockResolvedValue(mockResult as any);

      const result = await controller.startSession(mockRequest, dto);

      expect(service.startSession).toHaveBeenCalledWith(mockUserId, dto);
      expect(result).toEqual(mockResult);
      expect(result.initialChatMessage).not.toBeNull();
    });
  });

  describe('sendChatMessage', () => {
    it('should call service with userId, sessionId and message', async () => {
      const dto = { message: 'I struggle with being still' };
      const mockResult = {
        reply: "That's a common challenge. What makes it difficult for you?",
        timestamp: new Date(),
      };

      jest.spyOn(service, 'sendChatMessage').mockResolvedValue(mockResult);

      const result = await controller.sendChatMessage(
        mockUserId,
        mockSessionId,
        dto,
      );

      expect(service.sendChatMessage).toHaveBeenCalledWith(
        mockUserId,
        mockSessionId,
        dto.message,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('completeSession', () => {
    it('should call service with userId and sessionId', async () => {
      const mockResult = {
        message: 'Session completed successfully',
        sessionId: mockSessionId,
        completedAt: new Date(),
        durationSeconds: 600,
        streak: 1,
      };

      jest.spyOn(service, 'completeSession').mockResolvedValue(mockResult);

      const result = await controller.completeSession(
        mockUserId,
        mockSessionId,
      );

      expect(service.completeSession).toHaveBeenCalledWith(mockUserId, {
        sessionId: mockSessionId,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('getSessionById', () => {
    it('should call service with userId and sessionId for incomplete session', async () => {
      const mockResult = {
        session: {
          id: mockSessionId,
          verseReference: 'Psalm 46:10',
          verseText: 'Be still, and know that I am God.',
          startedAt: new Date(),
          completedAt: null, // Incomplete session
          durationSeconds: null,
          completed: false,
          initialReflection: 'This verse speaks to me',
          chatCount: 4,
        },
        chatHistory: [
          {
            id: 'chat-1',
            role: 'user',
            message: 'This verse speaks to me',
            createdAt: new Date(),
          },
          {
            id: 'chat-2',
            role: 'assistant',
            message: 'Thank you for sharing...',
            createdAt: new Date(),
          },
        ],
      };

      jest
        .spyOn(service, 'getSessionById')
        .mockResolvedValue(mockResult as any); // Use 'as any' to bypass type check

      const result = await controller.getSessionById(mockUserId, mockSessionId);

      expect(service.getSessionById).toHaveBeenCalledWith(
        mockUserId,
        mockSessionId,
      );
      expect(result).toEqual(mockResult);
      expect(result.chatHistory).toHaveLength(2);
    });

    it('should call service with userId and sessionId for completed session', async () => {
      const mockResult = {
        session: {
          id: mockSessionId,
          verseReference: 'Psalm 46:10',
          verseText: 'Be still, and know that I am God.',
          startedAt: new Date(),
          completedAt: new Date(), // Completed session
          durationSeconds: 600,
          completed: true,
          initialReflection: 'This verse speaks to me',
          chatCount: 4,
        },
        chatHistory: [
          {
            id: 'chat-1',
            role: 'user',
            message: 'This verse speaks to me',
            createdAt: new Date(),
          },
          {
            id: 'chat-2',
            role: 'assistant',
            message: 'Thank you for sharing...',
            createdAt: new Date(),
          },
        ],
      };

      jest
        .spyOn(service, 'getSessionById')
        .mockResolvedValue(mockResult as any);

      const result = await controller.getSessionById(mockUserId, mockSessionId);

      expect(service.getSessionById).toHaveBeenCalledWith(
        mockUserId,
        mockSessionId,
      );
      expect(result).toEqual(mockResult);
      expect(result.session.completed).toBe(true);
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

    it('should return sessions with chat previews', async () => {
      const dto = { page: 1, limit: 20 };
      const mockResult = {
        data: [
          {
            id: 'session-1',
            verseReference: 'Psalm 46:10',
            completedAt: new Date(),
            chatCount: 6,
            chatPreview: "That's a beautiful insight. What does...",
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      jest.spyOn(service, 'getHistory').mockResolvedValue(mockResult as any);

      const result = await controller.getHistory(mockRequest, dto);

      expect(service.getHistory).toHaveBeenCalledWith(mockUserId, dto);
      expect(result.data[0]).toHaveProperty('chatPreview');
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
