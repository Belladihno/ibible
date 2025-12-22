import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEmotion } from 'src/entities/user-emotions.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { LogEmotionDto } from './dto/log-emotion.dto';
import * as SYM from 'src/shared/constants/systemMessages';
import { VerseResponse } from 'src/shared/interfaces/discover.interface';
import { RedisService } from '../redis/redis.service';
import { BibleService } from '../bible/bible.service';
import { GeminiService } from '../gemini/gemini.service';
import { ReaFeature } from 'src/shared/enums';

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
    if (!emotion) throw new BadRequestException(SYM.EMOTION_REQUIRED);

    let user;
    if (userId) {
      user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) throw new BadRequestException(SYM.USER_NOT_FOUND);
    }

    // Check Redis cache first
    const cacheKey = `discover:emotion:${emotion.toLowerCase()}`;
    const cachedVerses = await this.redisService.get<VerseResponse[]>(cacheKey);
    if (cachedVerses) return cachedVerses;

    // Get verse references from Gemini
    const references = await this.getVerseReferences(emotion);

    // Fetch actual verses
    const verses = await this.fetchVersesFromReferences(references);

    // Cache for 1 hour
    await this.redisService.set(cacheKey, verses, 3600);

    // Persist emotion for authenticated users
    if (user) {
      const userEmotion = this.userEmotionRepo.create({
        user,
        emotion,
        loggedAt: new Date(),
      });
      await this.userEmotionRepo.save(userEmotion);
    }

    return verses;
  }

  private async getVerseReferences(emotion: string): Promise<string[]> {
    const prompt = `
      Return ONLY a valid JSON array of Bible verse references related to the emotion "${emotion}".
      NO markdown, NO explanation, NO code fences, NO tags.
      Generate 5-10 Bible verse references.
      Respond ONLY with this exact structure: ["Book chapter:verse", "Book chapter:verse", ...]
    `;

    try {
      const response = await this.geminiService.generate(
        ReaFeature.DISCOVER,
        prompt,
      );
      const references = JSON.parse(response);

      if (!Array.isArray(references) || references.length === 0) {
        throw new BadRequestException(
          `Gemini returned no references for emotion "${emotion}"`,
        );
      }

      return references.filter((ref): ref is string => typeof ref === 'string');
    } catch (error: any) {
      this.logger.error(
        `Failed to get verse references for emotion "${emotion}": ${error.message}`,
      );
      throw new BadRequestException(
        'Could not retrieve Bible verses for this emotion at the moment.',
      );
    }
  }

  private async fetchVersesFromReferences(
    references: string[],
  ): Promise<VerseResponse[]> {
    const verses: VerseResponse[] = [];

    for (const ref of references.slice(0, 10)) {
      try {
        const cleanRef = ref.replace(/\s+/g, '').toLowerCase();
        const verseData = (await this.bibleService.getVerse(cleanRef)) as any;

        if (verseData.verses?.length) {
          const verse = verseData.verses[0];
          verses.push({
            text: verse.text,
            bibleVerse: `${verse.book} ${verse.chapter}:${verse.verse}`,
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch verse ${ref}: ${error.message}`);
      }
    }

    if (verses.length === 0) {
      throw new BadRequestException('No valid verses could be retrieved');
    }

    return verses;
  }

  async getEmotionHistory(userId: string): Promise<UserEmotion[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException(SYM.USER_NOT_FOUND);

    return this.userEmotionRepo.find({
      where: { userId },
      order: { loggedAt: 'DESC' },
      select: ['id', 'emotion', 'loggedAt', 'createdAt', 'updatedAt'],
    });
  }
}
