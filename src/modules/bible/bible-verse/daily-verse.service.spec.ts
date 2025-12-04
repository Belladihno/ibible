import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { BadRequestException } from '@nestjs/common';
import { DailyVerse } from 'src/entities/bible-verse.entity';
import { DailyVerseConversation } from 'src/entities/daily-verse-conversation.entity';
import { DailyVerseConversationMessage } from 'src/entities/daily-verse-conversation-message.entity';
import {
  BibleVerse,
  BibleApiResponse,
} from 'src/shared/types/bible-verse.types';
import { BibleVerseService } from './daily-verse.service';
import { DailyVerseGeminiService } from './daily-verse-gemini.service';

describe('BibleVerseService', () => {
  let service: BibleVerseService;
  let dailyVerseRepo: Repository<DailyVerse>;
  let conversationRepo: Repository<DailyVerseConversation>;
  let messageRepo: Repository<DailyVerseConversationMessage>;
  let httpService: HttpService;
  let geminiService: DailyVerseGeminiService;

  const mockBibleApiResponse: BibleApiResponse = {
    translation: {
      identifier: 'web',
      name: 'World English Bible',
      language: 'English',
      language_code: 'eng',
      license: 'Public Domain',
    },
    random_verse: {
      book: 'John',
      book_id: 'JHN',
      chapter: 3,
      verse: 16,
      text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.',
    },
  };

  const mockBibleVerse: BibleVerse = {
    reference: 'John 3:16',
    book: 'John',
    chapter: 3,
    verse: 16,
    text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.',
    translation: {
      identifier: 'web',
      name: 'World English Bible',
      language: 'English',
      language_code: 'eng',
      license: 'Public Domain',
    },
  };

  const mockDailyVerse: DailyVerse = {
    id: 'test-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    date: new Date().toISOString().split('T')[0],
    reference: 'John 3:16',
    verseData: JSON.stringify(mockBibleVerse),
    aiSummary: null,
  };

  const mockConversation: DailyVerseConversation = {
    id: 'conv-id',
    userId: 'user-123',
    title: 'Daily Verse: John 3:16',
    verseReference: 'John 3:16',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };

  const mockMessage: DailyVerseConversationMessage = {
    id: 'msg-id',
    conversation: mockConversation,
    sender: 'assistant',
    content: 'Test message',
    createdAt: new Date(),
  };

  const mockDailyVerseRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockConversationRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockMessageRepository = {
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockGeminiService = {
    summarizeVerse: jest.fn(),
    generateReply: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BibleVerseService,
        {
          provide: getRepositoryToken(DailyVerse),
          useValue: mockDailyVerseRepository,
        },
        {
          provide: getRepositoryToken(DailyVerseConversation),
          useValue: mockConversationRepository,
        },
        {
          provide: getRepositoryToken(DailyVerseConversationMessage),
          useValue: mockMessageRepository,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: DailyVerseGeminiService,
          useValue: mockGeminiService,
        },
      ],
    }).compile();

    service = module.get<BibleVerseService>(BibleVerseService);
    dailyVerseRepo = module.get<Repository<DailyVerse>>(
      getRepositoryToken(DailyVerse),
    );
    conversationRepo = module.get<Repository<DailyVerseConversation>>(
      getRepositoryToken(DailyVerseConversation),
    );
    messageRepo = module.get<Repository<DailyVerseConversationMessage>>(
      getRepositoryToken(DailyVerseConversationMessage),
    );
    httpService = module.get<HttpService>(HttpService);
    geminiService = module.get<DailyVerseGeminiService>(
      DailyVerseGeminiService,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should fetch verse if not cached for today', async () => {
      mockDailyVerseRepository.findOne.mockResolvedValue(null);
      mockHttpService.get.mockReturnValue(
        of({
          data: mockBibleApiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: {} as Record<string, string> },
        } as AxiosResponse<BibleApiResponse>),
      );
      mockDailyVerseRepository.save.mockResolvedValue(mockDailyVerse);

      await service.onModuleInit();

      expect(mockDailyVerseRepository.findOne).toHaveBeenCalled();
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://bible-api.com/data/web/random',
      );
      expect(mockDailyVerseRepository.save).toHaveBeenCalled();
    });

    it('should not fetch verse if already cached for today', async () => {
      mockDailyVerseRepository.findOne.mockResolvedValue(mockDailyVerse);

      await service.onModuleInit();

      expect(mockDailyVerseRepository.findOne).toHaveBeenCalled();
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });
  });

  describe('getDailyVerse', () => {
    it('should return cached verse for today', async () => {
      mockDailyVerseRepository.findOne.mockResolvedValue(mockDailyVerse);

      const result = await service.getDailyVerse();

      expect(result).toEqual(mockBibleVerse);
      expect(mockDailyVerseRepository.findOne).toHaveBeenCalled();
    });

    it('should fetch and cache verse if not available for today', async () => {
      mockDailyVerseRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockDailyVerse);
      mockHttpService.get.mockReturnValue(
        of({
          data: mockBibleApiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: {} as Record<string, string> },
        } as AxiosResponse<BibleApiResponse>),
      );
      mockDailyVerseRepository.save.mockResolvedValue(mockDailyVerse);

      const result = await service.getDailyVerse();

      expect(result).toEqual(mockBibleVerse);
      expect(mockHttpService.get).toHaveBeenCalled();
      expect(mockDailyVerseRepository.save).toHaveBeenCalled();
    });

    it('should throw error if verse cannot be retrieved', async () => {
      mockDailyVerseRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockHttpService.get.mockReturnValue(
        of({
          data: mockBibleApiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: {} as Record<string, string> },
        } as AxiosResponse<BibleApiResponse>),
      );
      mockDailyVerseRepository.save.mockResolvedValue(mockDailyVerse);

      await expect(service.getDailyVerse()).rejects.toThrow(
        'Failed to retrieve daily verse',
      );
    });
  });

  describe('getDailyVerseWithSummary', () => {
    it('should return verse with AI-generated summary', async () => {
      const mockSummary =
        "This verse teaches about God's love.\n\nWhat does this mean to you?";
      mockDailyVerseRepository.findOne.mockResolvedValue(mockDailyVerse);
      mockGeminiService.summarizeVerse.mockResolvedValue(mockSummary);

      const result = await service.getDailyVerseWithSummary();

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Request successful');
      expect(result.data.verse).toEqual(mockBibleVerse);
      expect(result.data.summary).toBe(mockSummary);
      expect(result.data.verseId).toBeDefined();
      expect(result.data.timestamp).toBeDefined();
      expect(mockGeminiService.summarizeVerse).toHaveBeenCalledWith(
        mockBibleVerse,
      );
    });

    it('should return fallback summary if AI generation fails', async () => {
      mockDailyVerseRepository.findOne.mockResolvedValue(mockDailyVerse);
      mockGeminiService.summarizeVerse.mockRejectedValue(new Error('AI Error'));

      const result = await service.getDailyVerseWithSummary();

      expect(result.statusCode).toBe(200);
      expect(result.data.summary).toContain('Reflect on John 3:16');
      expect(result.data.verse).toEqual(mockBibleVerse);
    });
  });

  describe('startConversationForUser', () => {
    it('should create a new conversation with AI summary', async () => {
      const userId = 'user-123';
      const mockSummary = 'AI generated summary';

      const aiMessageWithSummary: DailyVerseConversationMessage = {
        ...mockMessage,
        content: mockSummary.trim(),
      };

      mockDailyVerseRepository.findOne.mockResolvedValue(mockDailyVerse);
      mockGeminiService.summarizeVerse.mockResolvedValue(mockSummary);
      mockConversationRepository.create.mockReturnValue(mockConversation);
      mockConversationRepository.save.mockResolvedValue(mockConversation);
      mockMessageRepository.create.mockReturnValue(aiMessageWithSummary);
      mockMessageRepository.save.mockResolvedValue(aiMessageWithSummary);

      const result = await service.startConversationForUser(userId);

      expect(result.conversation.id).toBe('conv-id');
      expect(result.conversation.userId).toBe(userId);
      expect(result.aiMessage.content).toBe(mockSummary.trim());
      expect(mockConversationRepository.create).toHaveBeenCalledWith({
        userId,
        title: 'Daily Verse: John 3:16',
        verseReference: 'John 3:16',
        messages: [],
        isActive: true,
      });
    });

    it('should throw error if userId is not provided', async () => {
      await expect(service.startConversationForUser('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('postMessageToConversation', () => {
    it('should post user message and get AI reply', async () => {
      const conversationId = 'conv-id';
      const userId = 'user-123';
      const userContent = 'What does this mean?';
      const aiReply = 'Here is my interpretation...';

      const userMessage: DailyVerseConversationMessage = {
        ...mockMessage,
        id: 'user-msg-id',
        sender: 'user',
        content: userContent,
      };

      const aiMessage: DailyVerseConversationMessage = {
        ...mockMessage,
        id: 'ai-msg-id',
        sender: 'assistant',
        content: aiReply,
      };

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);
      mockMessageRepository.create
        .mockReturnValueOnce(userMessage)
        .mockReturnValueOnce(aiMessage);
      mockMessageRepository.save.mockResolvedValue(mockMessage);
      mockMessageRepository.find.mockResolvedValue([userMessage, aiMessage]);
      mockGeminiService.generateReply.mockResolvedValue(aiReply);

      const result = await service.postMessageToConversation(
        conversationId,
        userId,
        userContent,
      );

      expect(result.conversation.id).toBe(conversationId);
      expect(result.messagePairs).toHaveLength(1);
      expect(result.messagePairs[0].user?.content).toBe(userContent);
      expect(result.messagePairs[0].assistant?.content).toBe(aiReply);
      expect(mockGeminiService.generateReply).toHaveBeenCalled();
    });

    it('should throw error if conversation not found', async () => {
      mockConversationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.postMessageToConversation('invalid-id', 'user-123', 'message'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if userId does not match', async () => {
      mockConversationRepository.findOne.mockResolvedValue(mockConversation);

      await expect(
        service.postMessageToConversation('conv-id', 'wrong-user', 'message'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listConversationsForUser', () => {
    it('should return list of conversations with message pairs', async () => {
      const userId = 'user-123';
      const conversationWithMessages: DailyVerseConversation = {
        ...mockConversation,
        messages: [
          {
            ...mockMessage,
            id: 'msg-1',
            sender: 'assistant',
            content: 'Hello',
          },
          { ...mockMessage, id: 'msg-2', sender: 'user', content: 'Hi there' },
          {
            ...mockMessage,
            id: 'msg-3',
            sender: 'assistant',
            content: 'How can I help?',
          },
        ],
      };

      mockConversationRepository.find.mockResolvedValue([
        conversationWithMessages,
      ]);

      const result = await service.listConversationsForUser(userId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('conv-id');
      expect(result[0].messagePairs).toBeDefined();
      expect(result[0].lastPair).toBeDefined();
    });

    it('should return empty array if no conversations exist', async () => {
      mockConversationRepository.find.mockResolvedValue([]);

      const result = await service.listConversationsForUser('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getConversationHistory', () => {
    it('should return conversation history with message pairs', async () => {
      const conversationId = 'conv-id';
      const userId = 'user-123';

      const conversationWithMessages: DailyVerseConversation = {
        ...mockConversation,
        messages: [
          {
            ...mockMessage,
            id: 'msg-1',
            sender: 'assistant',
            content: 'Welcome!',
          },
          { ...mockMessage, id: 'msg-2', sender: 'user', content: 'Thanks!' },
        ],
      };

      mockConversationRepository.findOne.mockResolvedValue(
        conversationWithMessages,
      );

      const result = await service.getConversationHistory(
        conversationId,
        userId,
      );

      expect(result.conversation.id).toBe(conversationId);
      expect(result.messagePairs).toBeDefined();
      expect(result.messagePairs.length).toBeGreaterThan(0);
    });

    it('should throw error if conversation not found', async () => {
      mockConversationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getConversationHistory('invalid-id', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if userId does not match', async () => {
      mockConversationRepository.findOne.mockResolvedValue(mockConversation);

      await expect(
        service.getConversationHistory('conv-id', 'wrong-user'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshDailyVerse', () => {
    it('should fetch and cache new verse', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: mockBibleApiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: {} as Record<string, string> },
        } as AxiosResponse<BibleApiResponse>),
      );
      mockDailyVerseRepository.save.mockResolvedValue(mockDailyVerse);
      mockDailyVerseRepository.delete.mockResolvedValue({
        affected: 1,
        raw: {},
      });

      await service.refreshDailyVerse();

      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://bible-api.com/data/web/random',
      );
      expect(mockDailyVerseRepository.delete).toHaveBeenCalled();
      expect(mockDailyVerseRepository.save).toHaveBeenCalled();
    });
  });

  describe('fetchAndCacheVerse', () => {
    it('should fetch verse from API and save to database', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: mockBibleApiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: {} as Record<string, string> },
        } as AxiosResponse<BibleApiResponse>),
      );
      mockDailyVerseRepository.save.mockResolvedValue(mockDailyVerse);
      mockDailyVerseRepository.delete.mockResolvedValue({
        affected: 1,
        raw: {},
      });

      await service['fetchAndCacheVerse']();

      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://bible-api.com/data/web/random',
      );
      expect(mockDailyVerseRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.any(String),
          reference: 'John 3:16',
          verseData: expect.any(String),
        }),
      );
    });

    it('should delete yesterday verse when caching new verse', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: mockBibleApiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: {} as Record<string, string> },
        } as AxiosResponse<BibleApiResponse>),
      );
      mockDailyVerseRepository.save.mockResolvedValue(mockDailyVerse);
      mockDailyVerseRepository.delete.mockResolvedValue({
        affected: 1,
        raw: {},
      });

      await service['fetchAndCacheVerse']();

      expect(mockDailyVerseRepository.delete).toHaveBeenCalledWith({
        date: expect.any(String),
      });
    });

    it('should throw error if API request fails', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('API Error')),
      );

      await expect(service['fetchAndCacheVerse']()).rejects.toThrow(
        'API Error',
      );
    });

    it('should transform API response correctly', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: mockBibleApiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: {} as Record<string, string> },
        } as AxiosResponse<BibleApiResponse>),
      );
      mockDailyVerseRepository.save.mockResolvedValue(mockDailyVerse);
      mockDailyVerseRepository.delete.mockResolvedValue({
        affected: 1,
        raw: {},
      });

      await service['fetchAndCacheVerse']();

      const savedData = mockDailyVerseRepository.save.mock.calls[0][0];
      const parsedVerse = JSON.parse(savedData.verseData) as BibleVerse;

      expect(parsedVerse.reference).toBe('John 3:16');
      expect(parsedVerse.book).toBe('John');
      expect(parsedVerse.chapter).toBe(3);
      expect(parsedVerse.verse).toBe(16);
      expect(parsedVerse.text).toBe(mockBibleApiResponse.random_verse.text);
      expect(parsedVerse.translation).toEqual(mockBibleApiResponse.translation);
    });
  });

  describe('forceRefresh', () => {
    it('should throw error as method is not implemented', () => {
      expect(() => service.forceRefresh()).toThrow('Method not implemented.');
    });
  });

  describe('date helpers', () => {
    it('should return today date in ISO format', () => {
      const today = service['getToday']();
      const expected = new Date().toISOString().split('T')[0];
      expect(today).toBe(expected);
    });

    it('should return yesterday date in ISO format', () => {
      const yesterday = service['getYesterday']();
      const expected = new Date();
      expected.setDate(expected.getDate() - 1);
      const expectedStr = expected.toISOString().split('T')[0];
      expect(yesterday).toBe(expectedStr);
    });
  });
});
