import { Test, TestingModule } from '@nestjs/testing';
import { MeditationService } from './meditation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MeditationPlan } from 'src/entities/meditation-plan.entity';
import { MeditationSession } from 'src/entities/meditation-session.entity';
import { MeditationChat } from 'src/entities/meditation-chat.entity';
import { MeditationVerseService } from './meditation-verse.service';
import { GeminiService } from '../gemini/gemini.service';
import { ChatRole } from 'src/shared/enums';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MeditationService', () => {
  let service: MeditationService;
  let planRepo: any;
  let sessionRepo: any;
  let chatRepo: any;
  let verseService: any;
  let gemini: any;

  beforeEach(async () => {
    planRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };
    sessionRepo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };
    chatRepo = { save: jest.fn(), find: jest.fn() };
    verseService = { getMeditationVerse: jest.fn() };
    gemini = { generate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeditationService,
        { provide: getRepositoryToken(MeditationPlan), useValue: planRepo },
        {
          provide: getRepositoryToken(MeditationSession),
          useValue: sessionRepo,
        },
        { provide: getRepositoryToken(MeditationChat), useValue: chatRepo },
        { provide: MeditationVerseService, useValue: verseService },
        { provide: GeminiService, useValue: gemini },
      ],
    }).compile();

    service = module.get<MeditationService>(MeditationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDailyMeditation', () => {
    it('should return daily meditation info', async () => {
      const fakePlan = {
        morningTime: '06:00',
        eveningTime: '20:00',
        morningEnabled: true,
        eveningEnabled: false,
        durationMinutes: 10,
      };
      planRepo.findOne.mockResolvedValue(fakePlan);
      verseService.getMeditationVerse.mockResolvedValue({
        reference: 'John 3:16',
        text: 'For God so loved the world...',
      });
      sessionRepo.find.mockResolvedValue([]);

      const result = await service.getDailyMeditation('user1');
      expect(result.plan.morningTime).toBe(fakePlan.morningTime);
      expect(result.verse.reference).toBe('John 3:16');
      expect(result.todayCompleted).toBe(false);
    });
  });

  describe('startSession', () => {
    it('should start a session without initial reflection', async () => {
      planRepo.findOne.mockResolvedValue({
        morningTime: '06:00',
        durationMinutes: 10,
      });
      verseService.getMeditationVerse.mockResolvedValue({
        reference: 'Psalm 23:1',
        text: 'The Lord is my shepherd',
      });
      sessionRepo.create.mockReturnValue({
        id: 'sess1',
        save: jest.fn(),
        chatCount: 0,
      });
      sessionRepo.save.mockResolvedValue({
        id: 'sess1',
        startedAt: new Date(),
      });

      const result = await service.startSession('user1', {
        sessionType: 'morning',
      });
      expect(result.sessionId).toBeDefined();
      expect(result.initialChatMessage).toBeNull();
    });

    it('should start a session with initial reflection and AI reply', async () => {
      planRepo.findOne.mockResolvedValue({
        morningTime: '06:00',
        durationMinutes: 10,
      });
      verseService.getMeditationVerse.mockResolvedValue({
        reference: 'Psalm 23:1',
        text: 'The Lord is my shepherd',
      });
      const session = { id: 'sess2', chatCount: 0, save: jest.fn() };
      sessionRepo.create.mockReturnValue(session);
      sessionRepo.save.mockResolvedValue(session);
      gemini.generate.mockResolvedValue({
        content: 'AI Reflection Reply',
        finishReason: 'stop',
        isComplete: true,
      });
      chatRepo.save.mockResolvedValue(true);

      const result = await service.startSession('user1', {
        sessionType: 'morning',
        initialReflection: 'Feeling grateful',
      });
      expect(result.initialChatMessage).toBe('AI Reflection Reply');
      expect(session.chatCount).toBe(2);
    });
  });

  describe('sendChatMessage', () => {
    it('should throw NotFoundException if session not found', async () => {
      sessionRepo.findOne.mockResolvedValue(null);
      await expect(
        service.sendChatMessage('user1', 'sess1', 'Hello'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should send chat message and get AI reply', async () => {
      const session = {
        id: 'sess1',
        userId: 'user1',
        verseReference: 'John 3:16',
        verseText: 'For God so loved the world...',
        chatCount: 0,
        save: jest.fn(),
      };
      sessionRepo.findOne.mockResolvedValue(session);
      chatRepo.find.mockResolvedValue([
        { role: ChatRole.USER, message: 'Hello' },
      ]);
      gemini.generate.mockResolvedValue({
        content: 'AI Reply',
        finishReason: 'stop',
        isComplete: true,
      });
      chatRepo.save.mockResolvedValue(true);
      sessionRepo.save.mockResolvedValue(session);

      const result = await service.sendChatMessage('user1', 'sess1', 'Hello');
      expect(result.reply).toBe('AI Reply');
      expect(session.chatCount).toBe(3);
    });
  });

  describe('completeSession', () => {
    it('should throw NotFoundException if session not found', async () => {
      sessionRepo.findOne.mockResolvedValue(null);
      await expect(
        service.completeSession('user1', { sessionId: 'sess1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if session already completed', async () => {
      const session = { completed: true };
      sessionRepo.findOne.mockResolvedValue(session);
      await expect(
        service.completeSession('user1', { sessionId: 'sess1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should complete session successfully', async () => {
      const session = {
        id: 'sess1',
        completed: false,
        startedAt: new Date(Date.now() - 5000),
        save: jest.fn(),
      };
      sessionRepo.findOne.mockResolvedValue(session);
      sessionRepo.save.mockResolvedValue(session);
      service['calculateStreak'] = jest.fn().mockResolvedValue(1);
      service['checkStreakMilestone'] = jest.fn().mockResolvedValue(undefined);

      const result = await service.completeSession('user1', {
        sessionId: 'sess1',
      });
      expect(result.sessionId).toBe('sess1');
      expect(result.streak).toBe(1);
      expect(session.completed).toBe(true);
    });
  });

  describe('getSessionById', () => {
    it('should throw NotFoundException if session not found', async () => {
      sessionRepo.findOne.mockResolvedValue(null);
      await expect(service.getSessionById('user1', 'sess1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return session with chat history', async () => {
      const session = {
        id: 'sess1',
        verseReference: 'John 3:16',
        verseText: 'Text',
        startedAt: new Date(),
        completed: false,
        chatCount: 1,
      };
      sessionRepo.findOne.mockResolvedValue(session);
      chatRepo.find.mockResolvedValue([
        {
          id: 'chat1',
          role: ChatRole.USER,
          message: 'Hello',
          createdAt: new Date(),
        },
      ]);

      const result = await service.getSessionById('user1', 'sess1');
      expect(result.session.id).toBe('sess1');
      expect(result.chatHistory.length).toBe(1);
    });
  });
});
