import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DailyVerse } from 'src/entities/bible-verse.entity';
import {
  BibleVerse,
  BibleApiResponse,
} from 'src/shared/types/bible-verse.types';

@Injectable()
export class BibleVerseService implements OnModuleInit {
  forceRefresh() {
    throw new Error('Method not implemented.');
  }
  private readonly logger = new Logger(BibleVerseService.name);
  private readonly API_URL = 'https://bible-api.com/data/web/random';

  constructor(
    @InjectRepository(DailyVerse)
    private readonly dailyVerseRepo: Repository<DailyVerse>,
  ) {}

  async onModuleInit() {
    // Fetch verse on startup if not cached for today
    await this.ensureDailyVerse();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshDailyVerse() {
    this.logger.log('Refreshing daily Bible verse...');
    await this.fetchAndCacheVerse();
  }


  async getDailyVerse(): Promise<BibleVerse> {
    await this.ensureDailyVerse();
    const today = this.getToday();
    const cached = await this.dailyVerseRepo.findOne({
      where: { date: today },
    });
    if (!cached) {
      throw new Error('Failed to retrieve daily verse');
    }
    console.log('Cached Verse Data:', cached.verseData);
    return JSON.parse(cached.verseData) as BibleVerse;
  }

  private async ensureDailyVerse(): Promise<void> {
    const today = this.getToday();
    const exists = await this.dailyVerseRepo.findOne({
      where: { date: today },
    });

    if (!exists) {
      await this.fetchAndCacheVerse();
    }
  }

  private async fetchAndCacheVerse(): Promise<void> {
    try {
      const response = await fetch(this.API_URL);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const apiResponse = (await response.json()) as BibleApiResponse;

      // Transform API response to our format
      const verse: BibleVerse = {
        reference: `${apiResponse.random_verse.book} ${apiResponse.random_verse.chapter}:${apiResponse.random_verse.verse}`,
        book: apiResponse.random_verse.book,
        chapter: apiResponse.random_verse.chapter,
        verse: apiResponse.random_verse.verse,
        text: apiResponse.random_verse.text,
        translation: apiResponse.translation,
      };

      const today = this.getToday();

      // Delete old verses (optional cleanup)
      await this.dailyVerseRepo.delete({
        date: this.getYesterday(),
      });

      // Save new verse
      await this.dailyVerseRepo.save({
        date: today,
        reference: verse.reference,
        verseData: JSON.stringify(verse),
      });

      this.logger.log(
        `Cached new daily verse: ${verse.reference} for ${today}`,
      );
    } catch (error) {
      this.logger.error('Failed to fetch and cache verse', error);
      throw error;
    }
  }

  private getToday(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  private getYesterday(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
}
