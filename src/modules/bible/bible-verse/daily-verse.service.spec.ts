import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { DailyVerse } from 'src/entities/bible-verse.entity';
import {
  BibleVerse,
  BibleApiResponse,
} from 'src/shared/types/bible-verse.types';
import { BibleVerseService } from './daily-verse.service';

describe('BibleVerseService', () => {
  let service: BibleVerseService;
  let dailyVerseRepo: Repository<DailyVerse>;
  let httpService: HttpService;

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
  };

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BibleVerseService,
        {
          provide: getRepositoryToken(DailyVerse),
          useValue: mockRepository,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<BibleVerseService>(BibleVerseService);
    dailyVerseRepo = module.get<Repository<DailyVerse>>(
      getRepositoryToken(DailyVerse),
    );
    httpService = module.get<HttpService>(HttpService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should fetch verse if not cached for today', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockHttpService.get.mockReturnValue(
        of({
          data: mockBibleApiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        } as AxiosResponse<BibleApiResponse>),
      );
      mockRepository.save.mockResolvedValue(mockDailyVerse);

      await service.onModuleInit();

      expect(mockRepository.findOne).toHaveBeenCalled();
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://bible-api.com/data/web/random',
      );
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should not fetch verse if already cached for today', async () => {
      mockRepository.findOne.mockResolvedValue(mockDailyVerse);

      await service.onModuleInit();

      expect(mockRepository.findOne).toHaveBeenCalled();
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });
  });

  describe('getDailyVerse', () => {
    it('should return cached verse for today', async () => {
      mockRepository.findOne.mockResolvedValue(mockDailyVerse);

      const result = await service.getDailyVerse();

      expect(result).toEqual(mockBibleVerse);
      expect(mockRepository.findOne).toHaveBeenCalled();
    });

    it('should fetch and cache verse if not available for today', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockDailyVerse);
      mockHttpService.get.mockReturnValue(
        of({
          data: mockBibleApiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        } as AxiosResponse<BibleApiResponse>),
      );
      mockRepository.save.mockResolvedValue(mockDailyVerse);

      const result = await service.getDailyVerse();

      expect(result).toEqual(mockBibleVerse);
      expect(mockHttpService.get).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw error if verse cannot be retrieved', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockHttpService.get.mockReturnValue(
        of({
          data: mockBibleApiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        } as AxiosResponse<BibleApiResponse>),
      );
      mockRepository.save.mockResolvedValue(mockDailyVerse);

      await expect(service.getDailyVerse()).rejects.toThrow(
        'Failed to retrieve daily verse',
      );
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
          config: {},
        } as AxiosResponse<BibleApiResponse>),
      );
      mockRepository.save.mockResolvedValue(mockDailyVerse);
      mockRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service.refreshDailyVerse();

      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://bible-api.com/data/web/random',
      );
      expect(mockRepository.delete).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
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
          config: {},
        } as AxiosResponse<BibleApiResponse>),
      );
      mockRepository.save.mockResolvedValue(mockDailyVerse);
      mockRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service['fetchAndCacheVerse']();

      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://bible-api.com/data/web/random',
      );
      expect(mockRepository.save).toHaveBeenCalledWith(
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
          config: {},
        } as AxiosResponse<BibleApiResponse>),
      );
      mockRepository.save.mockResolvedValue(mockDailyVerse);
      mockRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service['fetchAndCacheVerse']();

      expect(mockRepository.delete).toHaveBeenCalledWith({
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
          config: {},
        } as AxiosResponse<BibleApiResponse>),
      );
      mockRepository.save.mockResolvedValue(mockDailyVerse);
      mockRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service['fetchAndCacheVerse']();

      const savedData = mockRepository.save.mock.calls[0][0];
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
