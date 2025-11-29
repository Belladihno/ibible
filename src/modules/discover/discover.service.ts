import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEmotion } from 'src/entities/user-emotions.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { LogEmotionDto } from './dto/log-emotion.dto';
import * as SYM from 'src/shared/constants/systemMessages';
import { GeminiService } from '../chat/services/gemini.service';
import { VerseResponse } from 'src/shared/interfaces/discover.interface';

@Injectable()
export class DiscoverService {
  constructor(
    @InjectRepository(UserEmotion)
    private readonly userEmotionRepo: Repository<UserEmotion>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly geminiService: GeminiService,
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

    const prompt = `
Provide 5-10 Bible verses that relate to the emotion "${emotion}".
For each verse, return in this exact JSON format:
{"text": "the actual verse text", "bibleVerse": "Book Chapter:Verse (NIV)"}

Return ONLY a valid JSON array of objects, no other text or explanations.
Example:
[
  {"text": "Cast all your anxiety on him because he cares for you.", "bibleVerse": "1 Peter 5:7 (NIV)"},
  {"text": "Be still, and know that I am God.", "bibleVerse": "Psalm 46:10 (NIV)"}
]
`;

    const response = await this.geminiService.generateContent(prompt);

    let verses: VerseResponse[] = [];
    try {
      // Clean response (remove markdown code blocks if present)
      const cleaned = response
        .trim()
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      verses = JSON.parse(cleaned);

      // Validate structure
      if (!Array.isArray(verses) || verses.length === 0) {
        throw new Error('Invalid response format');
      }

      // Ensure each verse has required fields
      verses = verses
        .filter((v) => v.text && v.bibleVerse)
        .map((v) => ({
          text: v.text.trim(),
          bibleVerse: v.bibleVerse.trim(),
        }));
    } catch (error) {
      // Improved fallback: extract only Bible verse references
      const lines = response.split(/\r?\n/).map((line) => line.trim());

      // Regex to match Bible references: Book Chapter:Verse or Book Chapter:Verse-Verse
      const versePattern =
        /(?:1|2|3)?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+\d+:\d+(?:-\d+)?(?:\s+\([A-Z]+\))?/;

      verses = lines
        .filter((line) => {
          // Skip lines with JSON syntax
          if (
            line.includes('{') ||
            line.includes('}') ||
            line.includes('"text"') ||
            line.includes('"bibleVerse"') ||
            line.includes('[') ||
            line.includes(']')
          ) {
            return false;
          }
          // Only keep lines that match Bible verse pattern
          return versePattern.test(line);
        })
        .map((line) => ({
          text: 'See Bible verse for guidance',
          bibleVerse: line,
        }))
        .slice(0, 10);
    }

    // Save emotion log
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
