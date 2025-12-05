import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HistoryService } from './history.service';
import { ChatConversation } from '../../schemas/chat-conversation.schema';
import { DailyVerseConversation } from '../../entities/daily-verse-conversation.entity';

describe('HistoryService', () => {
  let service: HistoryService;
  let chatModel: any;
  let dailyVerseConversationRepo: any;

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
    dailyVerseConversationRepo = {
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
          provide: getRepositoryToken(DailyVerseConversation),
          useValue: dailyVerseConversationRepo,
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

  describe('getUnifiedHistory', () => {
    it('should return combined chat and daily verse history sorted by lastActivity', async () => {
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

      // Mock daily verse history
      const mockDailyVerseConversations = [
        {
          id: 'verse-conv-1',
          userId: mockUserId,
          verseReference: 'Psalm 46:10',
          isActive: true,
          messages: [
            {
              content: 'Meditation reflection',
              createdAt: new Date('2025-12-04'),
            },
          ],
          createdAt: new Date('2025-12-02'),
          updatedAt: new Date('2025-12-04'), // More recent
        },
      ];

      dailyVerseConversationRepo.find.mockResolvedValue(
        mockDailyVerseConversations,
      );

      const result = await service.getUnifiedHistory(mockUserId, 1, 10);

      expect(result.history).toHaveLength(2);
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 10,
      });

      // Verify sorting by lastActivity (most recent first)
      expect(result.history[0].id).toBe('verse-conv-1'); // 2025-12-04
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

      // Mock 10 daily verse conversations
      const mockDailyVerseConversations = Array.from(
        { length: 10 },
        (_, i) => ({
          id: `verse-conv-${i}`,
          userId: mockUserId,
          verseReference: 'Psalm 1:1',
          isActive: true,
          messages: [],
          createdAt: new Date(`2025-12-${String(i + 16).padStart(2, '0')}`),
          updatedAt: new Date(`2025-12-${String(i + 16).padStart(2, '0')}`),
        }),
      );

      chatModel.exec.mockResolvedValue(mockChats);
      dailyVerseConversationRepo.find.mockResolvedValue(
        mockDailyVerseConversations,
      );

      // Get page 2 with limit 10
      const result = await service.getUnifiedHistory(mockUserId, 2, 10);

      expect(result.history).toHaveLength(10);
      expect(result.pagination).toEqual({
        total: 25,
        page: 2,
        limit: 10,
      });
    });

    it('should handle empty history', async () => {
      chatModel.exec.mockResolvedValue([]);
      dailyVerseConversationRepo.find.mockResolvedValue([]);

      const result = await service.getUnifiedHistory(mockUserId, 1, 20);

      expect(result.history).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });
});
