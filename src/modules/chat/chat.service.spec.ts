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
  sort: jest.Mock<Promise<T>, any[]>;
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
      sort: jest.fn().mockResolvedValue([]),
    } as unknown as MockQuery<ChatConversation[]>);
    mockModel.findOne = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue(null),
    } as unknown as MockQuery<ChatConversation | null>);
    mockModel.sort = jest.fn().mockReturnThis();

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
  });

  describe('sendMessage', () => {
    it('should send a message and return user and AI responses', async () => {
      const userId = 'test-user-id';
      const messageDto: CreateMessageDto = { content: 'Hello, how are you?' };

      const mockExistingConversation = {
        _id: 'conversation-id',
        userId,
        messages: [],
        isActive: true,
        save: jest.fn().mockResolvedValue({
          _id: 'conversation-id',
          userId,
          messages: [
            {
              sender: MessageSender.USER,
              content: messageDto.content,
              timestamp: new Date(),
              references: [],
            },
            {
              sender: MessageSender.AI,
              content:
                "Thank you for sharing. I'm here to help you explore Bible-related questions and topics. Could you ask about a specific verse or topic?",
              timestamp: new Date(),
              references: [],
            },
          ],
        }),
      };

      jest.spyOn(model, 'findOne').mockReturnValueOnce({
        sort: jest.fn().mockResolvedValue(mockExistingConversation),
      } as unknown as MockQuery<typeof mockExistingConversation>);
      jest
        .spyOn(geminiService, 'generateContent')
        .mockResolvedValue(
          "Thank you for sharing. I'm here to help you explore Bible-related questions and topics. Could you ask about a specific verse or topic?",
        );

      const result = await service.sendMessage(userId, messageDto);

      expect(result).toBeDefined();
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].sender).toBe(MessageSender.USER);
      expect(result.messages[1].sender).toBe(MessageSender.AI);
    });

    it('should create new conversation if none exists', async () => {
      const userId = 'test-user-id';
      const messageDto: CreateMessageDto = { content: 'Test message' };

      const mockExistingConversation = null;
      const mockNewConversation = {
        _id: 'new-conversation-id',
        userId,
        messages: [],
        isActive: true,
        save: jest.fn().mockResolvedValue({
          _id: 'new-conversation-id',
          userId,
          messages: [
            {
              sender: MessageSender.USER,
              content: messageDto.content,
              timestamp: new Date(),
              references: [],
            },
            {
              sender: MessageSender.AI,
              content: 'AI response',
              timestamp: new Date(),
              references: [],
            },
          ],
        }),
      };

      jest.spyOn(model, 'findOne').mockReturnValueOnce({
        sort: jest.fn().mockResolvedValue(null),
      } as unknown as MockQuery<null>);

      model.mockImplementationOnce(
        (data: Partial<ChatConversation>): ChatConversation =>
          ({
            ...mockChatConversationDocument,
            ...data,
            save: jest.fn().mockResolvedValue(mockNewConversation),
          }) as ChatConversation,
      );

      jest
        .spyOn(geminiService, 'generateContent')
        .mockResolvedValue('AI response');

      const result = await service.sendMessage(userId, messageDto);

      expect(result).toBeDefined();
      expect(result).toEqual(mockNewConversation);
    });

    it('should use fallback response when Gemini API fails', async () => {
      const userId = 'test-user-id';
      const messageDto: CreateMessageDto = { content: 'Test message' };

      const mockExistingConversation = {
        _id: 'conversation-id',
        userId,
        messages: [],
        isActive: true,
        save: jest.fn().mockResolvedValue({
          _id: 'conversation-id',
          userId,
          messages: [
            {
              sender: MessageSender.USER,
              content: messageDto.content,
              timestamp: new Date(),
              references: [],
            },
            {
              sender: MessageSender.AI,
              content:
                "Hello! I'm Rea, your Bible-focused AI companion. I can help you explore Bible verses and topics. What would you like to learn about today?",
              timestamp: new Date(),
              references: [],
            },
          ],
        }),
      };

      jest.spyOn(model, 'findOne').mockReturnValueOnce({
        sort: jest.fn().mockResolvedValue(mockExistingConversation),
      } as unknown as MockQuery<typeof mockExistingConversation>);
      const result = await service.sendMessage(userId, messageDto);

      expect(result).toBeDefined();
      expect(result.messages[1].content).toContain(
        'Bible-focused AI companion',
      );
    });

    it('should use fallback response when Gemini returns empty content', async () => {
      const userId = 'test-user-id';
      const messageDto: CreateMessageDto = { content: 'Test message' };

      const mockExistingConversation = {
        _id: 'conversation-id',
        userId,
        messages: [],
        isActive: true,
        save: jest.fn().mockResolvedValue({
          _id: 'conversation-id',
          userId,
          messages: [
            {
              sender: MessageSender.USER,
              content: messageDto.content,
              timestamp: new Date(),
              references: [],
            },
            {
              sender: MessageSender.AI,
              content:
                "Hello! I'm Rea, your Bible-focused AI companion. I can help you explore Bible verses and topics. What would you like to learn about today?",
              timestamp: new Date(),
              references: [],
            },
          ],
        }),
      };

      jest.spyOn(model, 'findOne').mockReturnValueOnce({
        sort: jest.fn().mockResolvedValue(mockExistingConversation),
      } as unknown as MockQuery<typeof mockExistingConversation>);
      jest.spyOn(geminiService, 'generateContent').mockResolvedValue('');

      const result = await service.sendMessage(userId, messageDto);

      expect(result).toBeDefined();
      expect(result.messages[1].content).toContain(
        'Bible-focused AI companion',
      );
    });
  });

  describe('getConversations', () => {
    it('should return user conversations with id instead of _id', async () => {
      const userId = 'test-user-id';
      const mockConversations = [
        {
          _id: 'conv1',
          userId,
          title: 'Conversation 1',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
          toObject: jest.fn().mockReturnValue({
            _id: 'conv1',
            userId,
            title: 'Conversation 1',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            messages: [],
          } as PlainConversation),
        },
        {
          _id: 'conv2',
          userId,
          title: 'Conversation 2',
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
          toObject: jest.fn().mockReturnValue({
            _id: 'conv2',
            userId,
            title: 'Conversation 2',
            isActive: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            messages: [],
          } as PlainConversation),
        },
      ];

      jest.spyOn(model, 'find').mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockConversations),
      } as unknown as MockQuery<typeof mockConversations>);

      const result = await service.getConversations(userId);

      // Check that the result has 'id' instead of '_id'
      expect(result).toEqual([
        {
          id: 'conv1',
          userId: 'test-user-id',
          title: 'Conversation 1',
          isActive: true,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          messages: [],
        },
        {
          id: 'conv2',
          userId: 'test-user-id',
          title: 'Conversation 2',
          isActive: false,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          messages: [],
        },
      ]);
      expect(model.find).toHaveBeenCalledWith({ userId });
    });
  });

  describe('getConversationById', () => {
    it('should return a specific conversation with id instead of _id', async () => {
      const conversationId = 'test-conversation-id';
      const userId = 'test-user-id';
      const mockConversation = {
        _id: conversationId,
        userId,
        title: 'Test Conversation',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
        toObject: jest.fn().mockReturnValue({
          _id: conversationId,
          userId,
          title: 'Test Conversation',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
        } as PlainConversation),
      };

      jest.spyOn(model, 'findOne').mockResolvedValue(mockConversation);

      const result = await service.getConversationById(conversationId, userId);

      expect(result).toEqual({
        id: conversationId,
        userId: 'test-user-id',
        title: 'Test Conversation',
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        messages: [],
      });
      expect(model.findOne).toHaveBeenCalledWith({
        _id: conversationId,
        userId,
      });
    });

    it('should return null if conversation is not found', async () => {
      const conversationId = 'non-existent-id';
      const userId = 'test-user-id';

      jest.spyOn(model, 'findOne').mockResolvedValue(null);

      const result = await service.getConversationById(conversationId, userId);

      expect(result).toBeNull();
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
