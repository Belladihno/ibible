import { Test, TestingModule } from '@nestjs/testing';
import { MeditationService } from './meditation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MeditationPlan } from 'src/entities/meditation-plan.entity';
import { MeditationSession } from 'src/entities/meditation-session.entity';
import { MeditationVerseService } from './meditation-verse.service';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MeditationService', () => {
  let service: MeditationService;
  let sessionRepo: Repository<MeditationSession>;

  const mockUserId = 'user-123';
  const mockSessionId = 'session-123';

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
          provide: MeditationVerseService,
          useValue: {
            getMeditationVerse: jest.fn().mockResolvedValue({
              book: 'Psalm',
              chapter: 46,
              verse: 10,
              text: 'Be still, and know that I am God.',
              reference: 'Psalm 46:10',
              translation: 'NIV',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MeditationService>(MeditationService);
    sessionRepo = module.get<Repository<MeditationSession>>(
      getRepositoryToken(MeditationSession),
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

    it('should return sessions for user', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: mockUserId,
          completed: true,
          createdAt: new Date(),
        },
      ] as MeditationSession[];

      jest
        .spyOn(sessionRepo, 'findAndCount')
        .mockResolvedValue([mockSessions, 1]);

      const result = await service.getHistory(mockUserId, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
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

  describe('completeSession', () => {
    it('should throw NotFoundException if session does not exist', async () => {
      const findOneSpy = jest
        .spyOn(sessionRepo, 'findOne')
        .mockResolvedValue(null);

      await expect(
        service.completeSession(mockUserId, { sessionId: mockSessionId }),
      ).rejects.toThrow(NotFoundException);

      expect(findOneSpy).toHaveBeenCalled();
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
      const saveSpy = jest
        .spyOn(sessionRepo, 'save')
        .mockResolvedValue(activeSession);
      jest.spyOn(sessionRepo, 'find').mockResolvedValue([]);

      const result = await service.completeSession(mockUserId, {
        sessionId: mockSessionId,
      });

      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('completedAt');
      expect(result).toHaveProperty('durationSeconds');
      expect(saveSpy).toHaveBeenCalled();
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
  });
});
