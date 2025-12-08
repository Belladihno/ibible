// File: src/modules/chat/chat.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatService } from './chat.service';
import { GeminiService } from './services/gemini.service';
import { ChatConversation } from '../../schemas/chat-conversation.schema';
import { ChatMessage, MessageSender } from '../../schemas/chat-message.schema';
import { ChatContextService } from './services/chat-context.service';
import { CreateMessageDto } from './dto/create-message.dto';

// Helper type for mocking mongoose query-like objects with `sort()`
type MockQuery<T> = {
  sort: jest.Mock<any, any[]>;
  skip: jest.Mock<any, any[]>;
  limit: jest.Mock<any, any[]>;
  lean: jest.Mock<any, any[]>;
  exec?: jest.Mock<any, any[]>;
};

type PlainConversation = {
  _id: string;
  userId: string;
  title: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  messages: any[];
};

describe('ChatService', () => {
  let service: ChatService;
  let model: any;
  let geminiService: GeminiService;
  let chatContextService: ChatContextService;
  let redis: any;

  const mockChatConversationDocument = {
    userId: 'test-user-id',
    title: 'New Conversation',
    messages: [],
    isActive: true,
    save: jest.fn(),
  };

  const mockConversationObject = {
    _id: 'mock-id',
    userId: 'test-user-id',
    title: 'New Conversation',
    messages: [],
    isActive: true,
  };

  beforeEach(async () => {
    // Create a mock model constructor
    const mockModel: any = jest.fn().mockImplementation(
      (data: Partial<ChatConversation> = {}): ChatConversation =>
        ({
          ...mockChatConversationDocument,
          ...data,
          save: jest
            .fn()
            .mockResolvedValue({ ...mockChatConversationDocument, ...data }),
        }) as ChatConversation,
    );

    // Add static methods to the mock constructor
    mockModel.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
      exec: jest.fn().mockResolvedValue([]),
    });

    mockModel.findOne = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue(null),
    });

    mockModel.sort = jest.fn().mockReturnThis();
    mockModel.countDocuments = jest.fn().mockResolvedValue(0);
    mockModel.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getModelToken(ChatConversation.name),
          useValue: mockModel,
        },
        {
          provide: GeminiService,
          useValue: {
            generateContent: jest.fn(),
            generateBibleSpecificContent: jest.fn(),
            generateTitle: jest.fn().mockResolvedValue('AI Generated Title'),
          },
        },
        {
          provide: ChatContextService,
          useValue: {
            buildContext: jest.fn().mockResolvedValue('System Prompt'),
          },
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: {
            incr: jest.fn().mockResolvedValue(1),
            expire: jest.fn().mockResolvedValue(1),
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    model = module.get(getModelToken(ChatConversation.name));
    geminiService = module.get<GeminiService>(GeminiService);
    chatContextService = module.get<ChatContextService>(ChatContextService);
    redis = module.get('REDIS_CLIENT');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const userId = 'test-user-id';
      const mockSavedConversation = {
        _id: 'mock-id',
        userId,
        title: 'New Conversation',
        messages: [],
        isActive: true,
        save: jest.fn().mockResolvedValue(mockConversationObject),
      };

      model.mockImplementationOnce(
        (data: Partial<ChatConversation>): ChatConversation =>
          ({
            ...mockChatConversationDocument,
            ...data,
            save: jest.fn().mockResolvedValue(mockSavedConversation),
          }) as ChatConversation,
      );

      const result = await service.createConversation(userId);

      expect(result).toEqual(mockSavedConversation);
      expect(model).toHaveBeenCalledWith({
        userId,
        title: 'New Conversation',
        messages: [],
        isActive: true,
      });
    });

    it('should create a conversation with custom title', async () => {
      const userId = 'test-user-id';
      const customTitle = 'Custom Title';
      const mockSavedConversation = {
        _id: 'mock-id',
        userId,
        title: customTitle,
        messages: [],
        isActive: true,
        save: jest.fn().mockResolvedValue({
          _id: 'mock-id',
          userId,
          title: customTitle,
          messages: [],
          isActive: true,
        }),
      };

      model.mockImplementationOnce(
        (data: Partial<ChatConversation>): ChatConversation =>
          ({
            ...mockChatConversationDocument,
            ...data,
            save: jest.fn().mockResolvedValue(mockSavedConversation),
          }) as ChatConversation,
      );

      const result = await service.createConversation(userId, customTitle);

      expect(result.title).toBe(customTitle);
    });

    it('should create conversation with AI title when first message provided', async () => {
      const userId = 'test-user-id';
      const firstMessage = 'What is faith?';
      const aiTitle = 'Understanding Faith';

      const generateTitleSpy = jest
        .spyOn(geminiService, 'generateTitle')
        .mockResolvedValue(aiTitle);

      jest.spyOn(service as any, 'makeTitleUnique').mockResolvedValue(aiTitle);

      const mockSavedConversation = {
        _id: 'mock-id',
        userId,
        title: aiTitle,
        messages: [],
        isActive: true,
        save: jest.fn().mockResolvedValue({
          _id: 'mock-id',
          userId,
          title: aiTitle,
          messages: [],
          isActive: true,
        }),
      };

      model.mockImplementationOnce(
        (data: Partial<ChatConversation>): ChatConversation =>
          ({
            ...mockChatConversationDocument,
            ...data,
            save: jest.fn().mockResolvedValue(mockSavedConversation),
          }) as ChatConversation,
      );

      const result = await service.createConversation(userId, firstMessage);

      expect(generateTitleSpy).toHaveBeenCalledWith(firstMessage);
      expect(result.title).toBe(aiTitle);
    });
  });

  describe('searchConversationsByTitle', () => {
    it('should search conversations by title with pagination', async () => {
      const userId = 'test-user-id';
      const searchQuery = 'faith';
      const page = 1;
      const limit = 20;

      const mockConversations = [
        {
          _id: 'conv1',
          userId,
          title: 'Faith Journey',
          messages: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: 'conv2',
          userId,
          title: 'Living by Faith',
          messages: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockFindQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockConversations),
      };

      jest.spyOn(model, 'find').mockReturnValue(mockFindQuery);
      jest.spyOn(model, 'countDocuments').mockResolvedValue(2);

      const result = await service.searchConversationsByTitle(
        userId,
        searchQuery,
        page,
        limit,
      );

      expect(model.find).toHaveBeenCalledWith({
        userId,
        title: { $regex: new RegExp(searchQuery, 'i') },
        isActive: true,
      });
      expect(model.countDocuments).toHaveBeenCalled();

      expect(result.conversations).toHaveLength(2);
      expect(result.conversations[0].id).toBe('conv1');
      expect(result.conversations[0].title).toBe('Faith Journey');
      expect(result.conversations[1].id).toBe('conv2');
      expect(result.conversations[1].title).toBe('Living by Faith');

      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
        nextPage: null,
        prevPage: null,
      });

      expect(result.searchInfo).toEqual({
        query: 'faith',
        resultsCount: 2,
      });
    });

    it('should return empty results when no matches found', async () => {
      const userId = 'test-user-id';
      const searchQuery = 'nonexistent';

      const mockFindQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(model, 'find').mockReturnValue(mockFindQuery);
      jest.spyOn(model, 'countDocuments').mockResolvedValue(0);

      const result = await service.searchConversationsByTitle(
        userId,
        searchQuery,
      );

      expect(result.conversations).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.searchInfo.resultsCount).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      const userId = 'test-user-id';
      const searchQuery = 'test';
      const page = 2;
      const limit = 10;

      const mockConversations = Array(10)
        .fill(null)
        .map((_, i) => ({
          _id: `conv${i + 11}`,
          userId,
          title: `Test Conversation ${i + 11}`,
          messages: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

      const mockFindQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockConversations),
      };

      jest.spyOn(model, 'find').mockReturnValue(mockFindQuery);
      jest.spyOn(model, 'countDocuments').mockResolvedValue(25);

      const result = await service.searchConversationsByTitle(
        userId,
        searchQuery,
        page,
        limit,
      );

      expect(result.pagination).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
        nextPage: 3,
        prevPage: 1,
      });
    });
  });

  describe('searchConversations', () => {
    it('should search with multiple criteria', async () => {
      const userId = 'test-user-id';
      const criteria = {
        title: 'prayer',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        hasReferences: true,
      };

      const mockConversations = [
        {
          _id: 'conv1',
          userId,
          title: 'Prayer and Faith',
          messages: [
            {
              sender: MessageSender.USER,
              content: 'How to pray?',
              timestamp: new Date(),
              references: ['Matthew 6:9-13'],
            },
          ],
          isActive: true,
          createdAt: new Date('2025-06-15'),
          updatedAt: new Date('2025-06-15'),
        },
      ];

      const mockFindQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockConversations),
      };

      jest.spyOn(model, 'find').mockReturnValue(mockFindQuery);
      jest.spyOn(model, 'countDocuments').mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      } as any);

      const result = await service.searchConversations(userId, criteria, 1, 20);

      // Verify the query was built correctly
      const findCall = model.find.mock.calls[0][0];
      expect(findCall.userId).toBe(userId);
      expect(findCall.isActive).toBe(true);
      expect(findCall.title).toEqual({ $regex: expect.any(RegExp) });
      expect(findCall.createdAt.$gte).toEqual(criteria.startDate);
      expect(findCall.createdAt.$lte).toBeDefined();
      expect(findCall.messages).toEqual({
        $elemMatch: {
          references: { $exists: true, $ne: [], $not: { $size: 0 } },
        },
      });

      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].title).toBe('Prayer and Faith');
    });

    it('should search conversations without references', async () => {
      const userId = 'test-user-id';
      const criteria = {
        hasReferences: false,
      };

      const mockFindQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(model, 'find').mockReturnValue(mockFindQuery);
      jest.spyOn(model, 'countDocuments').mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      } as any);

      await service.searchConversations(userId, criteria);

      const findCall = model.find.mock.calls[0][0];
      expect(findCall.userId).toBe(userId);
      expect(findCall.isActive).toBe(true);
      expect(findCall['messages.references']).toEqual({ $exists: false });
    });

    it('should search by date range only', async () => {
      const userId = 'test-user-id';
      const criteria = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
      };

      const mockFindQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(model, 'find').mockReturnValue(mockFindQuery);
      jest.spyOn(model, 'countDocuments').mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      } as any);

      await service.searchConversations(userId, criteria);

      const findCall = model.find.mock.calls[0][0];
      expect(findCall.userId).toBe(userId);
      expect(findCall.isActive).toBe(true);
      expect(findCall.createdAt.$gte).toEqual(criteria.startDate);
      expect(findCall.createdAt.$lte).toBeDefined();
    });

    it('should search with only start date', async () => {
      const userId = 'test-user-id';
      const criteria = {
        startDate: new Date('2025-01-01'),
      };

      const mockFindQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(model, 'find').mockReturnValue(mockFindQuery);
      jest.spyOn(model, 'countDocuments').mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      } as any);

      await service.searchConversations(userId, criteria);

      const findCall = model.find.mock.calls[0][0];
      expect(findCall.userId).toBe(userId);
      expect(findCall.isActive).toBe(true);
      expect(findCall.createdAt.$gte).toEqual(criteria.startDate);
      expect(findCall.createdAt.$lte).toBeUndefined();
    });

    it('should search with only end date', async () => {
      const userId = 'test-user-id';
      const criteria = {
        endDate: new Date('2025-12-31'),
      };

      const mockFindQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(model, 'find').mockReturnValue(mockFindQuery);
      jest.spyOn(model, 'countDocuments').mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      } as any);

      await service.searchConversations(userId, criteria);

      const findCall = model.find.mock.calls[0][0];
      expect(findCall.userId).toBe(userId);
      expect(findCall.isActive).toBe(true);
      expect(findCall.createdAt.$gte).toBeUndefined();
      expect(findCall.createdAt.$lte).toBeDefined();
    });

    it('should search by title only', async () => {
      const userId = 'test-user-id';
      const criteria = {
        title: 'anxiety',
      };

      const mockFindQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(model, 'find').mockReturnValue(mockFindQuery);
      jest.spyOn(model, 'countDocuments').mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      } as any);

      await service.searchConversations(userId, criteria);

      const findCall = model.find.mock.calls[0][0];
      expect(findCall.userId).toBe(userId);
      expect(findCall.isActive).toBe(true);
      expect(findCall.title).toEqual({ $regex: expect.any(RegExp) });
    });
  });

  describe('getAITitleWithTimeout', () => {
    it('should return AI title when successful', async () => {
      const userMessage = 'What is prayer?';
      const aiTitle = 'Understanding Prayer';

      const generateTitleSpy = jest
        .spyOn(geminiService, 'generateTitle')
        .mockResolvedValue(aiTitle);

      const result = await (service as any).getAITitleWithTimeout(userMessage);

      expect(result).toBe(aiTitle);
      expect(generateTitleSpy).toHaveBeenCalledWith(userMessage);
    });

    it('should throw timeout error when Gemini takes too long', async () => {
      const userMessage = 'What is prayer?';

      jest.useFakeTimers();

      jest
        .spyOn(geminiService, 'generateTitle')
        .mockImplementation(() => new Promise(() => {}));

      const promise = (service as any).getAITitleWithTimeout(userMessage);

      jest.advanceTimersByTime(2100);

      await expect(promise).rejects.toThrow('AI title timeout');
      jest.useRealTimers();
    });
  });

  describe('getSimpleTitle', () => {
    it('should detect specific Bible stories', () => {
      const result = (service as any).getSimpleTitle(
        'Tell me about the prodigal son',
      );
      expect(result).toBe('The Prodigal Son');
    });

    it('should detect anxiety topic', () => {
      const result = (service as any).getSimpleTitle('I feel anxious today');
      expect(result).toBe('Anxiety Support');
    });

    it('should detect prayer topic', () => {
      const result = (service as any).getSimpleTitle('How do I pray?');
      expect(result).toBe('Prayer');
    });

    it('should extract scripture reference', () => {
      const result = (service as any).getSimpleTitle('Explain John 3:16');
      expect(result.trim()).toBe('John 3:16');
    });

    it('should use meaningful words for generic messages', () => {
      const result = (service as any).getSimpleTitle(
        'What does the Bible say about love and marriage?',
      );
      // The implementation detects "marriage" keyword and returns it directly
      expect(result).toBe('Marriage');
    });

    it('should return default for very short messages', () => {
      const result = (service as any).getSimpleTitle('Hi');
      expect(result).toBe('Bible Study');
    });
  });

  describe('makeTitleUnique', () => {
    it('should return original title if not duplicate', async () => {
      const userId = 'test-user-id';
      const baseTitle = 'Original Title';

      jest.spyOn(model, 'findOne').mockResolvedValue(null);

      const result = await (service as any).makeTitleUnique(userId, baseTitle);

      expect(result).toBe(baseTitle);
      expect(model.findOne).toHaveBeenCalledWith({
        userId,
        title: baseTitle,
      });
    });

    it('should add number to duplicate title', async () => {
      const userId = 'test-user-id';
      const baseTitle = 'Duplicate Title';

      jest.spyOn(model, 'findOne').mockResolvedValue({ _id: 'existing' });

      const mockSimilarTitles = [
        { title: 'Duplicate Title (1)' },
        { title: 'Duplicate Title (3)' },
      ];

      jest.spyOn(model, 'find').mockResolvedValue(mockSimilarTitles);

      const result = await (service as any).makeTitleUnique(userId, baseTitle);

      expect(result).toBe('Duplicate Title (4)');
    });

    it('should handle regex escape in title', async () => {
      const userId = 'test-user-id';
      const baseTitle = 'Title with (parentheses) [brackets]';

      jest.spyOn(model, 'findOne').mockResolvedValue(null);

      const result = await (service as any).makeTitleUnique(userId, baseTitle);

      expect(result).toBe(baseTitle);
    });

    it('should return original title on error', async () => {
      const userId = 'test-user-id';
      const baseTitle = 'Test Title';

      jest.spyOn(model, 'findOne').mockRejectedValue(new Error('DB Error'));

      const result = await (service as any).makeTitleUnique(userId, baseTitle);

      expect(result).toBe(baseTitle);
    });
  });

  describe('extractScriptureReferences', () => {
    it('should extract single scripture reference', () => {
      const content = 'Please read John 3:16';
      const result = (service as any).extractScriptureReferences(content);

      expect(result).toEqual(['John 3:16']);
    });

    it('should extract multiple scripture references', () => {
      const content = 'consider John 3:16 and Romans 8:28';
      const result = (service as any).extractScriptureReferences(content);

      expect(result).toEqual(['John 3:16', 'Romans 8:28']);
    });

    it('should handle verse ranges', () => {
      const content = 'Philippians 4:6-7 has great encouragement';
      const result = (service as any).extractScriptureReferences(content);

      expect(result).toEqual(['Philippians 4:6-7']);
    });

    it('should handle multi-word book names', () => {
      const content = 'I love 1 John 1:3-4 and 2 Corinthians 5:17';
      const result = (service as any).extractScriptureReferences(content);

      expect(result).toEqual(['1 John 1:3-4', '2 Corinthians 5:17']);
    });

    it('should return empty array for no references', () => {
      const content = 'Hello, how are you?';
      const result = (service as any).extractScriptureReferences(content);

      expect(result).toEqual([]);
    });
  });

  describe('getFallbackResponse', () => {
    it('should generate response acknowledging scripture references', () => {
      const userMessage = 'What does John 3:16 mean?';
      const references = ['John 3:16'];
      const result = (service as any).getFallbackResponse(
        userMessage,
        references,
      );

      expect(result).toContain('John 3:16');
      expect(result).toContain('I noticed you mentioned');
    });

    it('should generate anxiety-specific response', () => {
      const userMessage = 'I am feeling anxious today';
      const references: string[] = [];
      const result = (service as any).getFallbackResponse(
        userMessage,
        references,
      );

      expect(result).toContain('Philippians 4:6');
      expect(result).toContain('anxious');
    });

    it('should generate general response for other messages', () => {
      const userMessage = 'Tell me about prayer';
      const references: string[] = [];
      const result = (service as any).getFallbackResponse(
        userMessage,
        references,
      );

      expect(result).toContain('Bible-focused AI companion');
    });

    it('should never return empty content', () => {
      const userMessage = '';
      const references: string[] = [];
      const result = (service as any).getFallbackResponse(
        userMessage,
        references,
      );

      expect(result.trim()).not.toBe('');
      expect(result).toContain('explore Bible verses and topics');
    });
  });
});
