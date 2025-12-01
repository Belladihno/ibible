// ...existing code removed (duplicate class and imports)...
import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReadingLog } from '../../entities/reading-log.entity';
import { PassageResponse, VerseResponse } from '../../shared/types/bible.types';
import { extractVerses } from 'src/shared/utils/extract-verses';

const API_BASE = process.env.BIBLE_API_BASE_URL
  ? `${process.env.BIBLE_API_BASE_URL}`
  : 'https://rest.api.bible/v1';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

@Injectable()
export class BibleService {
  private readonly logger = new Logger(BibleService.name);
  private readonly redis: Redis;
  private readonly BIBLE_ID = 'de4e12af7f28f599-02';

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(ReadingLog)
    private readonly readingLogRepo: Repository<ReadingLog>,
  ) {
    const redisUrl =
      this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';

    this.redis = new Redis(redisUrl);
  }

  private getHeaders = () => {
    const apiKey =
      this.config.get<string>('BIBLE_API_KEY') ||
      process.env.BIBLE_API_KEY ||
      '';
    return {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    };
  };

  getVerse = async (
    verseId: string,
    translation = 'kjv',
  ): Promise<Record<string, unknown>> => {
    try {
      // verseId will be like: "genesis2:2" or "john3:16"
      const ref = verseId.toLowerCase();

      const cacheKey = `bible:verse:${ref}`;

      const url = `https://bible-api.com/${ref}?translation=${translation}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Bible API failed with status ${response.status}`);
      }

      const data = await response.json();

      // Bible API returns a list of verses even for a single verse
      const cleanData = {
        reference: data.reference,
        verses: data.verses?.map((v: any) => ({
          book: v.book_name,
          chapter: v.chapter,
          verse: v.verse,
          text: v.text.trim(),
        })),
        translation: data.translation_name,
      };

      return cleanData;
    } catch (err) {
      this.logger.error('getVerse error', err);
      throw new InternalServerErrorException(
        'Could not fetch verse from Bible API',
      );
    }
  };

  getBookChapter = async (
    book: string,
    chapter: number,
    translation = 'kjv',
  ): Promise<Record<string, unknown>> => {
    try {
      const bookLower = book.toLowerCase();
      const ref = `${bookLower}${chapter}`;
      const cacheKey = `bible:book_chapter:${ref}`;

      const url = `https://bible-api.com/${ref}?translation=${translation}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Bible API failed: ${response.status}`);
      }

      const data = await response.json();

      const cleanData = {
        reference: data.reference,
        verses: data.verses?.map((v: any) => ({
          book: v.book_name,
          chapter: v.chapter,
          verse: v.verse,
          text: v.text.trim(),
        })),
        translation: data.translation_name,
      };

      return cleanData;
    } catch (err) {
      this.logger.error('getBookChapter error', err);
      throw new InternalServerErrorException(
        'Could not fetch book chapter from Bible API',
      );
    }
  };

  getBooks = async (bibleId?: string): Promise<Record<string, unknown>> => {
    try {
      const id = bibleId || this.BIBLE_ID;
      const cacheKey = `bible:books:${id}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as Record<string, unknown>;

      const url = `${API_BASE}/bibles/${id}/books`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch books');
      const data = (await res.json()) as Record<string, unknown>;
      await this.redis.set(
        cacheKey,
        JSON.stringify(data),
        'EX',
        60 * 60 * 24 * 7,
      ); // 7 days
      return data;
    } catch (err) {
      this.logger.error('getBooks error', err);
      throw new InternalServerErrorException('Could not fetch books');
    }
  };

  getBibleVersions = async (): Promise<Record<string, unknown>> => {
    try {
      // const cacheKey = 'bible:versions';
      // const cached = await this.redis.get(cacheKey);
      // if (cached) return JSON.parse(cached) as Record<string, unknown>;

      // const url = `${API_BASE}/bibles`;
      // const res = await fetch(url, { headers: this.getHeaders() });
      // if (!res.ok) throw new Error('Failed to fetch Bible versions');
      // const data = (await res.json()) as Record<string, unknown>;
      // await this.redis.set(
      //   cacheKey,
      //   JSON.stringify(data),
      //   'EX',
      //   60 * 60 * 24 * 7,
      // ); // 7 days

      const versions = [
        {
          language: 'Cherokee',
          name: 'Cherokee New Testament',
          identifier: 'cherokee',
        },
        {
          language: 'Chinese',
          name: 'Chinese Union Version',
          identifier: 'cuv',
        },
        { language: 'Czech', name: 'Bible kralická', identifier: 'bkr' },
        {
          language: 'English',
          name: 'American Standard Version (1901)',
          identifier: 'asv',
        },
        {
          language: 'English',
          name: 'Bible in Basic English',
          identifier: 'bbe',
        },
        { language: 'English', name: 'Darby Bible', identifier: 'darby' },
        {
          language: 'English',
          name: 'Douay-Rheims 1899 American Edition',
          identifier: 'dra',
        },
        { language: 'English', name: 'King James Version', identifier: 'kjv' },
        {
          language: 'English',
          name: 'World English Bible (default)',
          identifier: 'web',
        },
        {
          language: 'English',
          name: "Young's Literal Translation",
          identifier: 'ylt',
        },
        {
          language: 'English (UK)',
          name: 'Open English Bible, Commonwealth Edition',
          identifier: 'oeb-cw',
        },
        {
          language: 'English (UK)',
          name: 'World English Bible, British Edition',
          identifier: 'webbe',
        },
        {
          language: 'English (US)',
          name: 'Open English Bible, US Edition',
          identifier: 'oeb-us',
        },
        {
          language: 'Latin',
          name: 'Clementine Latin Vulgate',
          identifier: 'clementine',
        },
        {
          language: 'Portuguese',
          name: 'João Ferreira de Almeida',
          identifier: 'almeida',
        },
        {
          language: 'Romanian',
          name: 'Romanian Cornilescu Version',
          identifier: 'rccv',
        },
      ];

      // 🔥 Transform into Swagger format
      const formatted = versions.map((v) => ({
        id: v.identifier,
        name: v.name,
        abbreviation: v.identifier,
        language: v.language,
        updatedAt: new Date().toISOString(),
      }));

      return { data: formatted };
    } catch (err) {
      this.logger.error('getBibleVersions error', err);
      throw new InternalServerErrorException('Could not fetch Bible versions');
    }
  };

  search = async (
    query: string,
    limit = 10,
    offset = 0,
  ): Promise<Record<string, unknown>> => {
    try {
      const cacheKey = `bible:search:${this.BIBLE_ID}:${query}:${limit}:${offset}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as Record<string, unknown>;

      const url = `${API_BASE}/bibles/${this.BIBLE_ID}/search?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) throw new Error('Failed to search Bible');
      const data = (await res.json()) as Record<string, unknown>;
      await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 60 * 60); // 1 hour
      return data;
    } catch (err) {
      this.logger.error('search error', err);
      throw new InternalServerErrorException('Could not search Bible');
    }
  };

  getAudioChapter = async (
    audioBibleId: string,
    chapterId: string,
  ): Promise<Record<string, unknown>> => {
    try {
      const cacheKey = `bible:audio:${audioBibleId}:${chapterId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as Record<string, unknown>;

      const url = `${API_BASE}/audio-bibles/${audioBibleId}/chapters/${chapterId}`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch audio chapter');
      const data = (await res.json()) as Record<string, unknown>;
      await this.redis.set(
        cacheKey,
        JSON.stringify(data),
        'EX',
        60 * 60 * 24 * 7,
      ); // 7 days
      return data;
    } catch (err) {
      this.logger.error('getAudioChapter error', err);
      throw new InternalServerErrorException('Could not fetch audio chapter');
    }
  };

  getAudioBibles = async (): Promise<Record<string, unknown>> => {
    try {
      const cacheKey = 'bible:audio-bibles';
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as Record<string, unknown>;

      const url = `${API_BASE}/audio-bibles`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch audio bibles');
      const data = (await res.json()) as Record<string, unknown>;
      await this.redis.set(
        cacheKey,
        JSON.stringify(data),
        'EX',
        60 * 60 * 24 * 7,
      ); // 7 days
      return data;
    } catch (err) {
      this.logger.error('getAudioBibles error', err);
      throw new InternalServerErrorException('Could not fetch audio bibles');
    }
  };

  logReadingSession = async (
    payload: Record<string, unknown>,
  ): Promise<{ success: boolean }> => {
    try {
      // Save to DB
      await this.readingLogRepo.save(payload);
      this.logger.log('Reading session logged', payload);
      return { success: true };
    } catch (err) {
      this.logger.error('logReadingSession error', err);
      throw new InternalServerErrorException('Could not log reading session');
    }
  };

  /**
   * Retrieve all reading logs
   */
  getReadingLogs = async (): Promise<ReadingLog[]> => {
    try {
      return await this.readingLogRepo.find();
    } catch (err) {
      this.logger.error('getReadingLogs error', err);
      throw new InternalServerErrorException('Could not fetch reading logs');
    }
  };
}
