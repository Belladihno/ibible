import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HistoryService } from './history.service';
import { ChatConversation } from '../../schemas/chat-conversation.schema';

describe('HistoryService', () => {
  let service: HistoryService;
  let chatModel: any;

  const mockUserId = 'test-user-123';

  beforeEach(async () => {
    // Mock MongoDB models
    chatModel = {
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryService,
        {
          provide: getModelToken(ChatConversation.name),
          useValue: chatModel,
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
    it('should return chat history sorted by lastActivity', async () => {
      // Mock chat history
      chatModel.exec.mockResolvedValue([
        {
          _id: { toString: () => 'chat-1' },
          title: 'Chat 1',
          messages: [{ content: 'Hi' }],
          updatedAt: new Date('2025-12-03'),
          createdAt: new Date('2025-12-01'),
        },
        {
          _id: { toString: () => 'chat-2' },
          title: 'Chat 2',
          messages: [{ content: 'Hello' }],
          updatedAt: new Date('2025-12-04'), // More recent
          createdAt: new Date('2025-12-02'),
        },
      ]);

      const result = await service.getUnifiedHistory(mockUserId, 1, 10);

      expect(result.history).toHaveLength(2);
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 10,
      });

      // Verify sorting by lastActivity (most recent first)
      expect(result.history[0].id).toBe('chat-2'); // 2025-12-04
      expect(result.history[1].id).toBe('chat-1'); // 2025-12-03
    });

    it('should paginate results correctly', async () => {
      // Mock 25 chat conversations
      const mockChats = Array.from({ length: 25 }, (_, i) => ({
        _id: { toString: () => `chat-${i}` },
        title: `Chat ${i}`,
        messages: [],
        updatedAt: new Date(`2025-12-${String(i + 1).padStart(2, '0')}`),
        createdAt: new Date('2025-12-01'),
      }));

      chatModel.exec.mockResolvedValue(mockChats);

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

      const result = await service.getUnifiedHistory(mockUserId, 1, 20);

      expect(result.history).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });
});
