import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MeditationDailyVerse } from 'src/entities/meditation-daily-verse.entity';
import { MeditationVerseLibrary } from 'src/entities/meditation-verse-library.entity';
import { MEDITATION_VERSE_REFERENCES } from './seeders/meditation.verses.seed';
import { BibleVerse } from 'src/shared/types/bible-verse.types';

@Injectable()
export class MeditationVerseService implements OnModuleInit {
  private readonly logger = new Logger(MeditationVerseService.name);
  private readonly BIBLE_API_URL = 'https://bible-api.com';

  constructor(
    @InjectRepository(MeditationDailyVerse)
    private readonly meditationVerseRepo: Repository<MeditationDailyVerse>,
    @InjectRepository(MeditationVerseLibrary)
    private readonly verseLibraryRepo: Repository<MeditationVerseLibrary>,
  ) {}

  async onModuleInit() {
    // Seed verse references on startup
    await this.seedVerseLibrary();
    // Ensure today's verse is ready
    await this.ensureMeditationVerse();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshMeditationVerse() {
    this.logger.log('Refreshing daily meditation verse...');
    await this.fetchAndCacheMeditationVerse();
  }

  async getMeditationVerse(): Promise<BibleVerse> {
    await this.ensureMeditationVerse();
    const today = this.getToday();

    const cached = await this.meditationVerseRepo.findOne({
      where: { date: today },
    });

    if (!cached) {
      throw new Error('Failed to retrieve meditation verse');
    }

    return JSON.parse(cached.verseData) as BibleVerse;
  }

  private async seedVerseLibrary(): Promise<void> {
    try {
      const existingCount = await this.verseLibraryRepo.count();

      if (existingCount > 0) {
        this.logger.log(
          `Verse library already seeded with ${existingCount} verses`,
        );
        return;
      }

      this.logger.log('Seeding meditation verse library...');

      for (const reference of MEDITATION_VERSE_REFERENCES) {
        try {
          await this.verseLibraryRepo.save({
            reference,
            active: true,
            timesUsed: 0,
          });
        } catch (error) {
          // Skip duplicates
          if (!error.message.includes('unique')) {
            this.logger.error(`Failed to seed ${reference}:`, error);
          }
        }
      }

      const totalSeeded = await this.verseLibraryRepo.count();
      this.logger.log(`✅ Seeded ${totalSeeded} meditation verses`);
    } catch (error) {
      this.logger.error('Failed to seed verse library:', error);
    }
  }

  private async ensureMeditationVerse(): Promise<void> {
    const today = this.getToday();
    const exists = await this.meditationVerseRepo.findOne({
      where: { date: today },
    });

    if (!exists) {
      await this.fetchAndCacheMeditationVerse();
    }
  }

  private async fetchAndCacheMeditationVerse(): Promise<void> {
    try {
      // Select verse intelligently (least used + oldest)
      const selectedVerse = await this.selectNextVerse();

      if (!selectedVerse) {
        throw new Error('No verses available in library');
      }

      // Fetch full verse text from API if not cached
      let verseData: BibleVerse;

      if (selectedVerse.text && selectedVerse.metadata) {
        // Use cached text
        verseData = selectedVerse.metadata as BibleVerse;
        this.logger.log(`Using cached text for ${selectedVerse.reference}`);
      } else {
        // Fetch from API
        verseData = await this.fetchVerseFromAPI(selectedVerse.reference);

        // Update library with fetched text
        await this.verseLibraryRepo.update(selectedVerse.id, {
          text: verseData.text,
          translation: verseData.translation?.identifier ?? null,
          metadata: verseData as any,
        });
      }

      // Update usage stats
      await this.verseLibraryRepo.update(selectedVerse.id, {
        timesUsed: selectedVerse.timesUsed + 1,
        lastUsed: new Date(),
      });

      const today = this.getToday();

      // Clean up old verses
      await this.meditationVerseRepo.delete({
        date: this.getYesterday(),
      });

      // Save today's verse
      await this.meditationVerseRepo.save({
        date: today,
        reference: verseData.reference,
        verseData: JSON.stringify(verseData),
      });

      this.logger.log(
        `✅ Cached meditation verse: ${verseData.reference} for ${today}`,
      );
    } catch (error) {
      this.logger.error('Failed to fetch and cache meditation verse:', error);
      await this.saveFallbackVerse();
    }
  }

  private async selectNextVerse(): Promise<MeditationVerseLibrary | null> {
    // Strategy: Use least-used verses first, then rotate by last used date
    const verses = await this.verseLibraryRepo.find({
      where: { active: true },
      order: {
        timesUsed: 'ASC',
        lastUsed: 'ASC',
      },
      take: 10,
    });

    if (verses.length === 0) {
      return null;
    }

    // Pick randomly from top 10 to add variety
    const randomIndex = Math.floor(Math.random() * verses.length);
    return verses[randomIndex];
  }

  private async fetchVerseFromAPI(reference: string): Promise<BibleVerse> {
    try {
      const url = `${this.BIBLE_API_URL}/${encodeURIComponent(reference)}?translation=web`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const apiResponse = await response.json();

      // Parse reference parts
      const parts = reference.match(
        /^(\d?\s?[A-Za-z]+)\s+(\d+):(\d+)(?:-(\d+))?$/,
      );
      const book = parts
        ? parts[1].trim()
        : apiResponse.reference.split(' ')[0];
      const chapter = parts ? parseInt(parts[2]) : 0;
      const verse = parts ? parseInt(parts[3]) : 0;

      return {
        reference: apiResponse.reference || reference,
        book,
        chapter,
        verse,
        text: apiResponse.text.trim(),
        translation: apiResponse.translation_name || 'WEB',
      };
    } catch (error) {
      this.logger.error(`Failed to fetch verse ${reference} from API:`, error);
      throw error;
    }
  }

  private async saveFallbackVerse(): Promise<void> {
    const fallbackVerse: BibleVerse = {
      reference: 'Psalm 46:10',
      book: 'Psalms',
      chapter: 46,
      verse: 10,
      text: 'Be still, and know that I am God. I will be exalted among the nations. I will be exalted in the earth.',
      translation: {
        identifier: 'WEB',
        name: 'World English Bible',
        language: 'English',
        language_code: 'en',
        license: 'Public Domain',
      },
    };

    const today = this.getToday();

    await this.meditationVerseRepo.save({
      date: today,
      reference: fallbackVerse.reference,
      verseData: JSON.stringify(fallbackVerse),
    });

    this.logger.log('⚠️ Saved fallback meditation verse');
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getYesterday(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
}
