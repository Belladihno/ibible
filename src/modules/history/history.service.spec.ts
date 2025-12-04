import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HistoryService } from './history.service';
import { ChatConversation } from '../../schemas/chat-conversation.schema';
import { MeditationSession } from 'src/entities/meditation-session.entity';
import { MeditationChat } from 'src/entities/meditation-chat.entity';

describe('HistoryService', () => {
  let service: HistoryService;
  let chatModel: any;
  let meditationSessionRepo: any;
  let meditationChatRepo: any;

  const mockUserId = 'test-user-123';

  beforeEach(async () => {
    // Mock MongoDB models
    chatModel = {
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    // Mock TypeORM repositories
    meditationSessionRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    meditationChatRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryService,
        {
          provide: getModelToken(ChatConversation.name),
          useValue: chatModel,
        },
        {
          provide: getRepositoryToken(MeditationSession),
          useValue: meditationSessionRepo,
        },
        {
          provide: getRepositoryToken(MeditationChat),
          useValue: meditationChatRepo,
        },
      ],
    }).compile();

    service = module.get<HistoryService>(HistoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getChatHistory', () => {
    it('should return chat conversations for a user', async () => {
      const mockConversations = [
        {
          _id: { toString: () => 'conv-1' },
          title: 'Test Chat',
          messages: [{ content: 'Hello' }],
          updatedAt: new Date('2025-12-03'),
          createdAt: new Date('2025-12-01'),
        },
      ];

      chatModel.exec.mockResolvedValue(mockConversations);

      const result = await service.getChatHistory(mockUserId);

      expect(chatModel.find).toHaveBeenCalledWith({ userId: mockUserId });
      expect(chatModel.sort).toHaveBeenCalledWith({ updatedAt: -1 });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'conv-1',
        type: 'chat',
        title: 'Test Chat',
        preview: 'Hello',
        messageCount: 1,
      });
    });

    it('should handle empty chat history', async () => {
      chatModel.exec.mockResolvedValue([]);

      const result = await service.getChatHistory(mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle conversations without messages', async () => {
      const mockConversations = [
        {
          _id: { toString: () => 'conv-1' },
          title: 'Empty Chat',
          messages: [],
          updatedAt: new Date('2025-12-03'),
          createdAt: new Date('2025-12-01'),
        },
      ];

      chatModel.exec.mockResolvedValue(mockConversations);

      const result = await service.getChatHistory(mockUserId);

      expect(result[0].preview).toBe('');
      expect(result[0].messageCount).toBe(0);
    });
  });

  describe('getMeditationHistory', () => {
    it('should return meditation sessions with chat history', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: mockUserId,
          verseReference: 'Psalm 46:10',
          verseText: 'Be still, and know that I am God.',
          chatCount: 5,
          completed: true,
          durationSeconds: 600,
          sessionType: 'morning',
          initialReflection: 'This verse brings peace',
          createdAt: new Date('2025-12-01'),
          updatedAt: new Date('2025-12-01'),
        },
      ];

      const mockChat = {
        id: 'chat-1',
        sessionId: 'session-1',
        message: 'Reflecting on this peaceful verse',
        role: 'user',
        createdAt: new Date('2025-12-01'),
      };

      meditationSessionRepo.find.mockResolvedValue(mockSessions);
      meditationChatRepo.findOne.mockResolvedValue(mockChat);

      const result = await service.getMeditationHistory(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'session-1',
        type: 'meditation',
        title: 'Meditation: Psalm 46:10',
        messageCount: 5,
      });
      expect(result[0].preview).toContain('Reflecting on this peaceful verse');
    });

    it('should handle sessions without chat', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: mockUserId,
          verseReference: 'Psalm 23:1',
          chatCount: 0,
          completed: false,
          createdAt: new Date('2025-12-01'),
          updatedAt: new Date('2025-12-01'),
        },
      ];

      meditationSessionRepo.find.mockResolvedValue(mockSessions);

      const result = await service.getMeditationHistory(mockUserId);

      expect(result).toEqual([]);
    });

    it('should use initialReflection as preview if no chat exists', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: mockUserId,
          verseReference: 'John 3:16',
          verseText: 'For God so loved the world...',
          chatCount: 1,
          initialReflection: 'God loves us deeply and unconditionally',
          createdAt: new Date('2025-12-01'),
          updatedAt: new Date('2025-12-01'),
        },
      ];

      meditationSessionRepo.find.mockResolvedValue(mockSessions);
      meditationChatRepo.findOne.mockResolvedValue(null);

      const result = await service.getMeditationHistory(mockUserId);

      expect(result[0].preview).toContain('God loves us deeply');
    });
  });

  describe('getUnifiedHistory', () => {
    it('should return combined chat and meditation history sorted by lastActivity', async () => {
      // Mock chat history
      chatModel.exec.mockResolvedValue([
        {
          _id: { toString: () => 'chat-1' },
          title: 'Chat 1',
          messages: [{ content: 'Hi' }],
          updatedAt: new Date('2025-12-03'),
          createdAt: new Date('2025-12-01'),
        },
      ]);

      // Mock meditation history
      const mockSessions = [
        {
          id: 'session-1',
          userId: mockUserId,
          verseReference: 'Psalm 46:10',
          chatCount: 2,
          completed: true,
          createdAt: new Date('2025-12-02'),
          updatedAt: new Date('2025-12-04'), // More recent
        },
      ];

      meditationSessionRepo.find.mockResolvedValue(mockSessions);
      meditationChatRepo.findOne.mockResolvedValue({
        message: 'Meditation reflection',
        createdAt: new Date('2025-12-04'),
      });

      const result = await service.getUnifiedHistory(mockUserId, 1, 10);

      expect(result.history).toHaveLength(2);
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      // Verify sorting by lastActivity (most recent first)
      expect(result.history[0].id).toBe('session-1'); // 2025-12-04
      expect(result.history[1].id).toBe('chat-1'); // 2025-12-03
    });

    it('should paginate results correctly', async () => {
      // Mock 15 chat conversations
      const mockChats = Array.from({ length: 15 }, (_, i) => ({
        _id: { toString: () => `chat-${i}` },
        title: `Chat ${i}`,
        messages: [],
        updatedAt: new Date(`2025-12-${String(i + 1).padStart(2, '0')}`),
        createdAt: new Date('2025-12-01'),
      }));

      // Mock 10 meditation sessions
      const mockSessions = Array.from({ length: 10 }, (_, i) => ({
        id: `session-${i}`,
        userId: mockUserId,
        verseReference: 'Psalm 1:1',
        chatCount: 1,
        createdAt: new Date(`2025-12-${String(i + 16).padStart(2, '0')}`),
        updatedAt: new Date(`2025-12-${String(i + 16).padStart(2, '0')}`),
      }));

      chatModel.exec.mockResolvedValue(mockChats);
      meditationSessionRepo.find.mockResolvedValue(mockSessions);
      meditationChatRepo.findOne.mockResolvedValue(null);

      // Get page 2 with limit 10
      const result = await service.getUnifiedHistory(mockUserId, 2, 10);

      expect(result.history).toHaveLength(10);
      expect(result.pagination).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });

    it('should handle empty history', async () => {
      chatModel.exec.mockResolvedValue([]);
      meditationSessionRepo.find.mockResolvedValue([]);

      const result = await service.getUnifiedHistory(mockUserId, 1, 20);

      expect(result.history).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });
});
