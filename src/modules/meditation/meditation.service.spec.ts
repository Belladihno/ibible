/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { MeditationService } from './meditation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MeditationPlan } from 'src/entities/meditation-plan.entity';
import { MeditationSession } from 'src/entities/meditation-session.entity';
import { MeditationChat } from 'src/entities/meditation-chat.entity';
import { MeditationVerseService } from './meditation-verse.service';
import { ReflectionGeminiService } from './services/meditation-gemini-service';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  BibleVerse,
  BibleTranslation,
} from 'src/shared/types/bible-verse.types';

describe('MeditationService', () => {
  let service: MeditationService;
  let sessionRepo: Repository<MeditationSession>;
  let chatRepo: Repository<MeditationChat>;
  let planRepo: Repository<MeditationPlan>;
  let verseService: MeditationVerseService;
  let geminiService: ReflectionGeminiService;

  const mockUserId = 'user-123';
  const mockSessionId = 'session-123';

  const mockTranslation: BibleTranslation = {
    identifier: 'web',
    name: 'World English Bible',
    language: 'English',
    language_code: 'en',
    license: 'Public Domain',
  };

  const mockVerse: BibleVerse = {
    book: 'Psalm',
    chapter: 46,
    verse: 10,
    text: 'Be still, and know that I am God.',
    reference: 'Psalm 46:10',
    translation: mockTranslation, // ✅ Now it's a full object
  };

  const mockPlan = {
    id: 'plan-123',
    userId: mockUserId,
    morningTime: '06:00:00',
    eveningTime: '20:00:00',
    morningEnabled: true,
    eveningEnabled: false,
    durationMinutes: 10,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeditationService,
        {
          provide: getRepositoryToken(MeditationPlan),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MeditationSession),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MeditationChat),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: MeditationVerseService,
          useValue: {
            getMeditationVerse: jest.fn().mockResolvedValue(mockVerse),
          },
        },
        {
          provide: ReflectionGeminiService,
          useValue: {
            generateReflection: jest
              .fn()
              .mockResolvedValue('AI greeting message'),
            generateContinuedReflection: jest
              .fn()
              .mockResolvedValue('AI response'),
          },
        },
      ],
    }).compile();

    service = module.get<MeditationService>(MeditationService);
    sessionRepo = module.get<Repository<MeditationSession>>(
      getRepositoryToken(MeditationSession),
    );
    chatRepo = module.get<Repository<MeditationChat>>(
      getRepositoryToken(MeditationChat),
    );
    planRepo = module.get<Repository<MeditationPlan>>(
      getRepositoryToken(MeditationPlan),
    );
    verseService = module.get<MeditationVerseService>(MeditationVerseService);
    geminiService = module.get<ReflectionGeminiService>(
      ReflectionGeminiService,
    );
  });

  describe('getHistory', () => {
    it('should return empty array when no sessions exist', async () => {
      jest.spyOn(sessionRepo, 'findAndCount').mockResolvedValue([[], 0]);

      const result = await service.getHistory(mockUserId, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should return sessions for user with chat previews', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: mockUserId,
          completed: true,
          completedAt: new Date(),
          createdAt: new Date(),
        },
      ] as MeditationSession[];

      const mockChat = {
        id: 'chat-1',
        sessionId: 'session-1',
        message: 'This is a reflection message',
        role: 'user',
      } as MeditationChat;

      jest
        .spyOn(sessionRepo, 'findAndCount')
        .mockResolvedValue([mockSessions, 1]);
      jest.spyOn(chatRepo, 'findOne').mockResolvedValue(mockChat);

      const result = await service.getHistory(mockUserId, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('chatPreview');
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should apply pagination correctly', async () => {
      const mockSessions = [] as MeditationSession[];
      jest
        .spyOn(sessionRepo, 'findAndCount')
        .mockResolvedValue([mockSessions, 50]);

      const result = await service.getHistory(mockUserId, {
        page: 2,
        limit: 20,
      });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('should filter by date range', async () => {
      const findAndCountSpy = jest
        .spyOn(sessionRepo, 'findAndCount')
        .mockResolvedValue([[], 0]);

      await service.getHistory(mockUserId, {
        page: 1,
        limit: 20,
        startDate: '2025-11-01',
        endDate: '2025-11-30',
      });

      expect(findAndCountSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            completedAt: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('startSession', () => {
    it('should start session without initial reflection', async () => {
      jest
        .spyOn(planRepo, 'findOne')
        .mockResolvedValue(mockPlan as MeditationPlan);
      jest
        .spyOn(verseService, 'getMeditationVerse')
        .mockResolvedValue(mockVerse);

      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        startedAt: new Date(),
        sessionType: 'morning',
        verseReference: mockVerse.reference,
        verseText: mockVerse.text,
        completed: false,
        chatCount: 0,
      };

      jest.spyOn(sessionRepo, 'create').mockReturnValue(mockSession as any);
      jest.spyOn(sessionRepo, 'save').mockResolvedValue(mockSession as any);

      const result = await service.startSession(mockUserId, {
        sessionType: 'morning',
      });

      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('verse');
      expect(result.initialChatMessage).toBeNull();
    });

    it('should start session with initial reflection and AI response', async () => {
      jest
        .spyOn(planRepo, 'findOne')
        .mockResolvedValue(mockPlan as MeditationPlan);
      jest
        .spyOn(verseService, 'getMeditationVerse')
        .mockResolvedValue(mockVerse);

      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        startedAt: new Date(),
        sessionType: 'morning',
        verseReference: mockVerse.reference,
        verseText: mockVerse.text,
        completed: false,
        chatCount: 0,
        initialReflection: 'This verse speaks to me',
      };

      jest.spyOn(sessionRepo, 'create').mockReturnValue(mockSession as any);
      jest.spyOn(sessionRepo, 'save').mockResolvedValue(mockSession as any);
      jest.spyOn(chatRepo, 'save').mockResolvedValue({} as any);
      jest
        .spyOn(geminiService, 'generateReflection')
        .mockResolvedValue('AI greeting');

      const result = await service.startSession(mockUserId, {
        sessionType: 'morning',
        initialReflection: 'This verse speaks to me',
      });

      expect(result.initialChatMessage).toBe('AI greeting');
      expect(chatRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendChatMessage', () => {
    it('should throw NotFoundException if session not found', async () => {
      jest.spyOn(sessionRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.sendChatMessage(mockUserId, mockSessionId, 'Hello'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should send message and get AI response', async () => {
      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        verseReference: 'Psalm 46:10',
        verseText: 'Be still, and know that I am God.',
        chatCount: 0,
      };

      const mockHistory = [
        { role: 'user', message: 'Previous message', createdAt: new Date() },
      ] as MeditationChat[];

      jest.spyOn(sessionRepo, 'findOne').mockResolvedValue(mockSession as any);
      jest.spyOn(chatRepo, 'save').mockResolvedValue({} as any);
      jest.spyOn(chatRepo, 'find').mockResolvedValue(mockHistory);
      jest
        .spyOn(geminiService, 'generateContinuedReflection')
        .mockResolvedValue('AI reply');
      jest.spyOn(sessionRepo, 'save').mockResolvedValue(mockSession as any);

      const result = await service.sendChatMessage(
        mockUserId,
        mockSessionId,
        'New message',
      );

      expect(result).toHaveProperty('reply', 'AI reply');
      expect(result).toHaveProperty('timestamp');
      expect(chatRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('getSessionById', () => {
    it('should throw NotFoundException if session not found', async () => {
      jest.spyOn(sessionRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.getSessionById(mockUserId, mockSessionId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return session with chat history', async () => {
      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        verseReference: 'Psalm 46:10',
        verseText: 'Be still, and know that I am God.',
        startedAt: new Date(),
        completedAt: null,
        durationSeconds: null,
        completed: false,
        initialReflection: 'Initial thought',
        chatCount: 2,
      };

      const mockChats = [
        {
          id: 'chat-1',
          role: 'user',
          message: 'User message',
          createdAt: new Date(),
        },
        {
          id: 'chat-2',
          role: 'assistant',
          message: 'AI response',
          createdAt: new Date(),
        },
      ] as MeditationChat[];

      jest.spyOn(sessionRepo, 'findOne').mockResolvedValue(mockSession as any);
      jest.spyOn(chatRepo, 'find').mockResolvedValue(mockChats);

      const result = await service.getSessionById(mockUserId, mockSessionId);

      expect(result).toHaveProperty('session');
      expect(result).toHaveProperty('chatHistory');
      expect(result.chatHistory).toHaveLength(2);
    });
  });

  describe('completeSession', () => {
    it('should throw NotFoundException if session does not exist', async () => {
      jest.spyOn(sessionRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.completeSession(mockUserId, { sessionId: mockSessionId }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if session already completed', async () => {
      const completedSession = {
        id: mockSessionId,
        userId: mockUserId,
        completed: true,
      } as MeditationSession;

      jest.spyOn(sessionRepo, 'findOne').mockResolvedValue(completedSession);

      await expect(
        service.completeSession(mockUserId, { sessionId: mockSessionId }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should complete session successfully', async () => {
      const activeSession = {
        id: mockSessionId,
        userId: mockUserId,
        completed: false,
        startedAt: new Date(),
      } as MeditationSession;

      jest.spyOn(sessionRepo, 'findOne').mockResolvedValue(activeSession);
      jest.spyOn(sessionRepo, 'save').mockResolvedValue(activeSession);
      jest.spyOn(sessionRepo, 'find').mockResolvedValue([activeSession]);

      const result = await service.completeSession(mockUserId, {
        sessionId: mockSessionId,
      });

      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('completedAt');
      expect(result).toHaveProperty('durationSeconds');
      expect(result).toHaveProperty('streak');
    });
  });

  describe('calculateStreak', () => {
    it('should return 0 when no completed sessions', async () => {
      jest.spyOn(sessionRepo, 'find').mockResolvedValue([]);

      const streak = await service.calculateStreak(mockUserId);

      expect(streak).toBe(0);
    });

    it('should return 0 when last session is too old', async () => {
      const oldSession = {
        completedAt: new Date('2025-11-01'),
        completed: true,
      } as MeditationSession;

      jest.spyOn(sessionRepo, 'find').mockResolvedValue([oldSession]);

      const streak = await service.calculateStreak(mockUserId);

      expect(streak).toBe(0);
    });

    it('should calculate streak correctly for consecutive days', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const sessions = [
        { completedAt: today, completed: true },
        { completedAt: yesterday, completed: true },
      ] as MeditationSession[];

      jest.spyOn(sessionRepo, 'find').mockResolvedValue(sessions);

      const streak = await service.calculateStreak(mockUserId);

      expect(streak).toBeGreaterThan(0);
    });
  });

  describe('getDailyMeditation', () => {
    it('should return daily meditation data', async () => {
      jest
        .spyOn(planRepo, 'findOne')
        .mockResolvedValue(mockPlan as MeditationPlan);
      jest
        .spyOn(verseService, 'getMeditationVerse')
        .mockResolvedValue(mockVerse);
      jest.spyOn(sessionRepo, 'find').mockResolvedValue([]);

      const result = await service.getDailyMeditation(mockUserId);

      expect(result).toHaveProperty('plan');
      expect(result).toHaveProperty('verse');
      expect(result).toHaveProperty('streak');
      expect(result.verse.reference).toBe('Psalm 46:10');
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      const mockSessions = [
        {
          completedAt: new Date(),
          completed: true,
          durationSeconds: 600,
        },
        {
          completedAt: new Date(),
          completed: true,
          durationSeconds: 300,
        },
      ] as MeditationSession[];

      jest.spyOn(sessionRepo, 'find').mockResolvedValue(mockSessions);

      const stats = await service.getStatistics(mockUserId);

      expect(stats).toHaveProperty('totalSessions', 2);
      expect(stats).toHaveProperty('totalDurationSeconds', 900);
      expect(stats).toHaveProperty('averageDurationSeconds', 450);
    });
  });
});
