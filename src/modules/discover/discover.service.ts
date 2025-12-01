import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEmotion } from 'src/entities/user-emotions.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { LogEmotionDto } from './dto/log-emotion.dto';
import * as SYM from 'src/shared/constants/systemMessages';
import { GeminiService } from '../chat/services/gemini.service';
import { VerseResponse } from 'src/shared/interfaces/discover.interface';
import { extractSafeVerses } from 'src/shared/utils/gemini-parse';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DiscoverService {
  constructor(
    @InjectRepository(UserEmotion)
    private readonly userEmotionRepo: Repository<UserEmotion>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly geminiService: GeminiService,
    private readonly redisService: RedisService,
  ) {}

  async createEmotion(
    logEmotionDto: LogEmotionDto,
    userId: string,
  ): Promise<VerseResponse[]> {
    const { emotion } = logEmotionDto;

    if (!emotion) {
      throw new BadRequestException(SYM.EMOTION_REQUIRED);
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException(SYM.USER_NOT_FOUND);
    }

    // Check cache first
    const cacheKey = `discover:emotion:${emotion.toLowerCase()}`;
    const cachedVerses = await this.redisService.get<VerseResponse[]>(cacheKey);
    if (cachedVerses) {
      return cachedVerses;
    }

    const prompt = `
        Return ONLY a valid JSON array.
        NO markdown. NO explanation. NO code fences. NO tags.

        Generate 5–10 Bible verses related to the emotion "${emotion}".

        Respond ONLY with this exact structure:

        [
          {
            "text": "verse text",
            "bibleVerse": "Book chapter:verse"
          }
        ]
        `;

    const response = await this.geminiService.generateContent(prompt);
    let verses: VerseResponse[] = [];
    try {
      verses = JSON.parse(response);
    } catch (e) {
      verses = extractSafeVerses(response);
      if (!verses.length) {
        throw new BadRequestException(
          'Failed to parse verse response. Response may have been truncated.',
        );
      }
    }

    // Save the verses to Redis for future requests
    await this.redisService.set(cacheKey, verses, 3600); // cache for 1 hour

    const userEmotion = this.userEmotionRepo.create({
      user: user,
      emotion: emotion,
      loggedAt: new Date(),
    });

    await this.userEmotionRepo.save(userEmotion);

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
