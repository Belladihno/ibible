import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEmotion } from 'src/entities/user-emotions.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { LogEmotionDto } from './dto/log-emotion.dto';
import * as SYM from 'src/shared/constants/systemMessages';
import { GeminiService } from '../chat/services/gemini.service';
import { VerseResponse } from 'src/shared/interfaces/discover.interface';
import { RedisService } from '../redis/redis.service';
import { BibleService } from '../bible/bible.service';

@Injectable()
export class DiscoverService {
  private readonly logger = new Logger(DiscoverService.name);

  constructor(
    @InjectRepository(UserEmotion)
    private readonly userEmotionRepo: Repository<UserEmotion>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly geminiService: GeminiService,
    private readonly redisService: RedisService,
    private readonly bibleService: BibleService,
  ) {}

  async createEmotion(
    logEmotionDto: LogEmotionDto,
    userId?: string,
  ): Promise<VerseResponse[]> {
    const { emotion } = logEmotionDto;

    if (!emotion) {
      throw new BadRequestException(SYM.EMOTION_REQUIRED);
    }

    let user;
    if (userId) {
      user = await this.userRepo.findOne({ where: { id: userId } });

      if (!user) {
        throw new BadRequestException(SYM.USER_NOT_FOUND);
      }
    }

    // Check cache first
    const cacheKey = `discover:emotion:${emotion.toLowerCase()}`;
    const cachedVerses = await this.redisService.get<VerseResponse[]>(cacheKey);
    if (cachedVerses) {
      return cachedVerses;
    }

    // First, try to get verse references from Gemini
    const references = await this.getVerseReferences(emotion);

    // Then fetch actual verses using the references
    const verses = await this.fetchVersesFromReferences(references);

    // Save the verses to Redis for future requests
    await this.redisService.set(cacheKey, verses, 3600); // cache for 1 hour

    // Only persist emotion history for authenticated users
    if (user) {
      const userEmotion = this.userEmotionRepo.create({
        user: user,
        emotion: emotion,
        loggedAt: new Date(),
      });

      await this.userEmotionRepo.save(userEmotion);
    }

    return verses;
  }

  private async getVerseReferences(emotion: string): Promise<string[]> {
    const prompt = `
      Return ONLY a valid JSON array of Bible verse references related to the emotion "${emotion}".
      NO markdown. NO explanation. NO code fences. NO tags.

      Generate 5-10 Bible verse references that would help someone feeling "${emotion}".

      Respond ONLY with this exact structure:
      ["Book chapter:verse", "Book chapter:verse", ...]
    `;

    try {
      const response = await this.geminiService.generateContent(prompt);
      const references = JSON.parse(response);

      if (!Array.isArray(references) || references.length === 0) {
        throw new Error('Invalid references format');
      }

      // Ensure all items are strings
      return references.filter((ref): ref is string => typeof ref === 'string');
    } catch (error: any) {
      this.logger.error(
        `Failed to get verse references for emotion "${emotion}":`,
        error.message,
      );

      // If it's a RECITATION error, try with a different prompt
      if (error.message?.includes('RECITATION')) {
        return this.getVerseReferencesWithFallback(emotion);
      }

      // Otherwise, use fallback
      return this.getFallbackReferences(emotion);
    }
  }

  private async getVerseReferencesWithFallback(
    emotion: string,
  ): Promise<string[]> {
    const prompt = `
      Suggest Bible verses for someone feeling ${emotion}.
      Return only a JSON array of verse references like: ["Psalm 23:1", "John 14:27"]
      No explanations, just the array.
    `;

    try {
      const response = await this.geminiService.generateContent(prompt);
      const references = JSON.parse(response);
      return Array.isArray(references)
        ? references.filter((ref): ref is string => typeof ref === 'string')
        : this.getFallbackReferences(emotion);
    } catch (error) {
      this.logger.error(
        `Fallback prompt also failed for emotion "${emotion}":`,
        error.message,
      );
      return this.getFallbackReferences(emotion);
    }
  }

  private getFallbackReferences(emotion: string): string[] {
    // Static fallback mappings for common emotions
    const fallbackMap: Record<string, string[]> = {
      happy: ['Psalm 100:1', 'Philippians 4:4', 'Proverbs 15:13'],
      sad: ['Psalm 34:18', 'Matthew 5:4', 'Isaiah 41:10'],
      anxious: ['Philippians 4:6', 'Psalm 56:3', '1 Peter 5:7'],
      angry: ['Ephesians 4:26', 'Proverbs 16:32', 'James 1:19'],
      grateful: ['1 Thessalonians 5:18', 'Psalm 100:4', 'Colossians 3:17'],
      lonely: ['Psalm 25:16', 'Hebrews 13:5', 'Deuteronomy 31:6'],
      hopeful: ['Jeremiah 29:11', 'Romans 15:13', 'Psalm 39:7'],
      fearful: ['Psalm 23:4', 'Isaiah 41:10', 'Joshua 1:9'],
      joyful: ['Psalm 16:11', 'Nehemiah 8:10', 'John 15:11'],
      peaceful: ['John 14:27', 'Philippians 4:7', 'Colossians 3:15'],
    };

    const lowerEmotion = emotion.toLowerCase();
    return (
      fallbackMap[lowerEmotion] || [
        'Psalm 119:105',
        'Joshua 1:8',
        'Proverbs 3:5',
      ]
    );
  }

  private async fetchVersesFromReferences(
    references: string[],
  ): Promise<VerseResponse[]> {
    const verses: VerseResponse[] = [];

    for (const ref of references.slice(0, 10)) {
      // Limit to 10 verses
      try {
        // Convert "Book chapter:verse" to API format
        const cleanRef = ref.replace(/\s+/g, '').toLowerCase();
        const verseData = (await this.bibleService.getVerse(cleanRef)) as any;

        if (
          verseData.verses &&
          Array.isArray(verseData.verses) &&
          verseData.verses.length > 0
        ) {
          const verse = verseData.verses[0];
          verses.push({
            text: verse.text,
            bibleVerse: `${verse.book} ${verse.chapter}:${verse.verse}`,
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch verse ${ref}:`, error.message);
        // Continue with other verses
      }
    }

    if (verses.length === 0) {
      throw new BadRequestException('No valid verses could be retrieved');
    }

    return verses;
  }

  async getEmotionHistory(userId: string): Promise<UserEmotion[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException(SYM.USER_NOT_FOUND);
    }

    const emotionHistory = await this.userEmotionRepo.find({
      where: { userId: userId },
      order: { loggedAt: 'DESC' },
      select: ['id', 'emotion', 'loggedAt', 'createdAt', 'updatedAt'],
    });

    return emotionHistory;
  }
}
