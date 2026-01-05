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
import { GeminiService } from 'src/modules/gemini/gemini.service';
import { ReaFeature } from 'src/shared/enums';

describe('BibleVerseService', () => {
  let service: BibleVerseService;
  let dailyVerseRepo: Repository<DailyVerse>;
  let conversationRepo: Repository<DailyVerseConversation>;
  let messageRepo: Repository<DailyVerseConversationMessage>;
  let httpService: HttpService;
  let geminiSvc: GeminiService;

  const mockBibleApiResponse: BibleApiResponse = {
    translation: {
      identifier: 'kjv',
      name: 'King James Version',
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
    text: mockBibleApiResponse.random_verse.text,
    translation: mockBibleApiResponse.translation,
  };

  const mockDailyVerse = {
    id: 'test-id',
    date: new Date().toISOString().split('T')[0],
    reference: 'John 3:16',
    verseData: JSON.stringify(mockBibleVerse),
    aiSummary: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConversation = {
    id: 'conv-id',
    userId: 'user-123',
    title: 'Daily Verse: John 3:16',
    verseReference: 'John 3:16',
    isActive: true,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage = {
    id: 'msg-id',
    conversation: mockConversation,
    sender: 'assistant',
    content: 'Test message',
    createdAt: new Date(),
  };

  const mockDailyVerseRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockConversationRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockMessageRepo = {
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockGeminiSvc = {
    generate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BibleVerseService,
        {
          provide: getRepositoryToken(DailyVerse),
          useValue: mockDailyVerseRepo,
        },
        {
          provide: getRepositoryToken(DailyVerseConversation),
          useValue: mockConversationRepo,
        },
        {
          provide: getRepositoryToken(DailyVerseConversationMessage),
          useValue: mockMessageRepo,
        },
        { provide: HttpService, useValue: mockHttpService },
        { provide: GeminiService, useValue: mockGeminiSvc },
      ],
    }).compile();

    service = module.get<BibleVerseService>(BibleVerseService);
    dailyVerseRepo = module.get(getRepositoryToken(DailyVerse));
    conversationRepo = module.get(getRepositoryToken(DailyVerseConversation));
    messageRepo = module.get(getRepositoryToken(DailyVerseConversationMessage));
    httpService = module.get(HttpService);
    geminiSvc = module.get(GeminiService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDailyVerseWithSummary', () => {
    it('should return fallback summary if AI fails', async () => {
      mockDailyVerseRepo.findOne.mockResolvedValue({
        ...mockDailyVerse,
        aiSummary: null,
      });
      mockGeminiSvc.generate.mockRejectedValue(new Error('AI Error'));

      const result = await service.getDailyVerseWithSummary();

      expect(result.data.summary).toContain('Reflect on John 3:16');
      expect(result.data.verse).toEqual(mockBibleVerse);
    });

    it('should call Gemini generate with correct params for success', async () => {
      mockDailyVerseRepo.findOne.mockResolvedValue({
        ...mockDailyVerse,
        aiSummary: null,
      });
      const aiSummary = 'This verse shows God’s love.';
      mockGeminiSvc.generate.mockResolvedValue({
        content: aiSummary,
        finishReason: 'stop',
        isComplete: true,
      });

      const result = await service.getDailyVerseWithSummary();

      expect(result.data.summary).toBe(aiSummary);
      expect(mockGeminiSvc.generate).toHaveBeenCalledWith(
        ReaFeature.BIBLE,
        mockBibleVerse.text,
        expect.objectContaining({
          systemPrompt: expect.stringContaining('Provide a concise biblical summary'),
        }),
      );
    });
  });

  describe('postMessageToConversation', () => {
    it('should post user message and get AI reply', async () => {
      const userContent = 'What does this mean?';
      const aiReply = 'Here is my interpretation...';

      mockConversationRepo.findOne.mockResolvedValue(mockConversation);
      mockMessageRepo.create.mockImplementation(({ sender, content }) => ({
        ...mockMessage,
        sender,
        content,
      }));
      mockMessageRepo.save.mockResolvedValue(mockMessage);
      mockMessageRepo.find.mockResolvedValue([
        { ...mockMessage, sender: 'user', content: userContent },
        { ...mockMessage, sender: 'assistant', content: aiReply },
      ]);
      mockGeminiSvc.generate.mockResolvedValue({
        content: aiReply,
        finishReason: 'stop',
        isComplete: true,
      });

      const result = await service.postMessageToConversation(
        'conv-id',
        'user-123',
        userContent,
      );

      expect(result.messagePairs[0].user?.content).toBe(userContent);
      expect(result.messagePairs[0].assistant?.content).toBe(aiReply);
      expect(mockGeminiSvc.generate).toHaveBeenCalledWith(
        ReaFeature.BIBLE,
        userContent,
        expect.objectContaining({
          systemPrompt: expect.any(String),
        }),
      );
    });
  });
});

