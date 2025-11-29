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
      // More lenient fallback parsing
      const lines = response.split(/\r?\n/).filter((line) => line.trim());

      // Try to extract verses from various formats
      const versePattern =
        /([1-3]?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+):(\d+(?:-\d+)?)/;

      verses = [];

      for (const line of lines) {
        const match = line.match(versePattern);
        if (match) {
          // Extract the full Bible reference including (NIV) if present
          const bibleVerseMatch = line.match(
            /([1-3]?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*\s+\d+:\d+(?:-\d+)?(?:\s*\([A-Z]+\))?)/,
          );
          const bibleVerse = bibleVerseMatch ? bibleVerseMatch[0] : null;

          if (bibleVerse) {
            // Try to extract text before the reference
            let text = line.split(bibleVerse)[0].trim();

            // Remove quotes, dashes, asterisks, numbers at start
            text = text
              .replace(/^["'\-*\d.\s]+/, '')
              .replace(/["'\-*]+$/, '')
              .trim();

            // If no meaningful text found, use fallback
            if (text.length < 10) {
              text = 'See Bible verse for guidance';
            }

            verses.push({
              text: text,
              bibleVerse: bibleVerse.trim(),
            });
          }
        }
      }

      // If still empty, create a minimal fallback based on emotion
      if (verses.length === 0) {
        const fallbackVerses = {
          anxious: {
            text: 'Cast all your anxiety on him because he cares for you.',
            bibleVerse: '1 Peter 5:7 (NIV)',
          },
          anxiety: {
            text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.',
            bibleVerse: 'Philippians 4:6 (NIV)',
          },
          sad: {
            text: 'The Lord is close to the brokenhearted and saves those who are crushed in spirit.',
            bibleVerse: 'Psalm 34:18 (NIV)',
          },
          joy: {
            text: 'Rejoice in the Lord always. I will say it again: Rejoice!',
            bibleVerse: 'Philippians 4:4 (NIV)',
          },
          anger: {
            text: 'In your anger do not sin: Do not let the sun go down while you are still angry.',
            bibleVerse: 'Ephesians 4:26 (NIV)',
          },
          faith: {
            text: 'Now faith is confidence in what we hope for and assurance about what we do not see.',
            bibleVerse: 'Hebrews 11:1 (NIV)',
          },
          fear: {
            text: 'For God has not given us a spirit of fear, but of power and of love and of a sound mind.',
            bibleVerse: '2 Timothy 1:7 (NIV)',
          },
        };

        const fallback = fallbackVerses[emotion.toLowerCase()] || {
          text: 'The Lord is my strength and my shield; my heart trusts in him, and he helps me.',
          bibleVerse: 'Psalm 28:7 (NIV)',
        };

        verses = [fallback];
      }
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
      where: { user: { id: userId } },
      order: { loggedAt: 'DESC' },
      select: ['id', 'emotion', 'loggedAt', 'createdAt', 'updatedAt'],
    });

    return emotionHistory;
  }
}
