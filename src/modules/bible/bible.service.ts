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
    this.redis = new Redis(REDIS_URL);
  }

  private getHeaders() {
    const apiKey =
      this.config.get<string>('BIBLE_API_KEY') ||
      process.env.BIBLE_API_KEY ||
      '';
    return {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    };
  }

  async getChapter(chapterId: string): Promise<Record<string, unknown>> {
    try {
      const cacheKey = `bible:chapter:${this.BIBLE_ID}:${chapterId}:content=json:clean`;
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as Record<string, unknown>;

      const url = `${API_BASE}/bibles/${this.BIBLE_ID}/passages/${encodeURIComponent(
        chapterId,
      )}?content-type=json`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch chapter');
      const raw = (await res.json()) as PassageResponse;
      const data = raw.data;
      const content = Array.isArray(data?.content)
        ? extractVerses(data.content)
        : [];

      const cleanData = {
        id: data?.id,
        orgId: data?.orgId,
        bibleId: data?.bibleId,
        bookId: data?.bookId,
        chapterIds: data?.chapterIds,
        reference: data?.reference,
        content,
      };
      await this.redis.set(
        cacheKey,
        JSON.stringify(cleanData),
        'EX',
        60 * 60 * 24 * 7,
      ); // 7 days
      return cleanData;
    } catch (err) {
      this.logger.error('getChapter error', err);
      throw new InternalServerErrorException('Could not fetch chapter');
    }
  }

  async getVerse(verseId: string): Promise<Record<string, unknown>> {
    try {
      const cacheKey = `bible:verse:${this.BIBLE_ID}:${verseId}:content=json:clean`;
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as Record<string, unknown>;

      const url = `${API_BASE}/bibles/${this.BIBLE_ID}/verses/${verseId}?content-type=json`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch verse');
      const raw = (await res.json()) as VerseResponse;
      const data = raw?.data;
      const content = Array.isArray(data?.content)
        ? extractVerses(data.content)
        : [];

      const cleanData = {
        id: data?.id,
        orgId: data?.orgId,
        bibleId: data?.bibleId,
        bookId: data?.bookId,
        chapterId:
          data?.chapterId ??
          (data?.chapterIds ? data.chapterIds[0] : undefined),
        reference: data?.reference,
        content,
        verseCount: data?.verseCount,
        next: data?.next,
        previous: data?.previous,
        timestamp: data?.timestamp,
        copyright: data?.copyright,
      };

      await this.redis.set(
        cacheKey,
        JSON.stringify(cleanData),
        'EX',
        60 * 60 * 24 * 7,
      ); // 7 days
      return cleanData;
    } catch (err) {
      this.logger.error('getVerse error', err);
      throw new InternalServerErrorException('Could not fetch verse');
    }
  }

  async getBooks(bibleId?: string): Promise<Record<string, unknown>> {
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
  }

  async getBibleVersions(): Promise<Record<string, unknown>> {
    try {
      const cacheKey = 'bible:versions';
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as Record<string, unknown>;

      const url = `${API_BASE}/bibles`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch Bible versions');
      const data = (await res.json()) as Record<string, unknown>;
      await this.redis.set(
        cacheKey,
        JSON.stringify(data),
        'EX',
        60 * 60 * 24 * 7,
      ); // 7 days
      return data;
    } catch (err) {
      this.logger.error('getBibleVersions error', err);
      throw new InternalServerErrorException('Could not fetch Bible versions');
    }
  }

  async search(
    query: string,
    limit = 10,
    offset = 0,
  ): Promise<Record<string, unknown>> {
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
  }

  async getAudioChapter(
    audioBibleId: string,
    chapterId: string,
  ): Promise<Record<string, unknown>> {
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
  }

  async getAudioBibles(): Promise<Record<string, unknown>> {
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
  }

  async logReadingSession(
    payload: Record<string, unknown>,
  ): Promise<{ success: boolean }> {
    try {
      // Save to DB
      await this.readingLogRepo.save(payload);
      this.logger.log('Reading session logged', payload);
      return { success: true };
    } catch (err) {
      this.logger.error('logReadingSession error', err);
      throw new InternalServerErrorException('Could not log reading session');
    }
  }
}
