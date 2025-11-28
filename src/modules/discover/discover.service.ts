import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEmotion } from 'src/entities/user-emotions.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { LogEmotionDto } from './dto/log-emotion.dto';
import * as SYM from 'src/shared/constants/systemMessages';
import { GeminiService } from '../chat/services/gemini.service';

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
  ): Promise<string[]> {
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
            Format: Book Chapter:Verse only. No commentary.
        `;

    const response = await this.geminiService.generateContent(prompt);

    // Split the response into a clean array of verses
    const verses = response
      .split(/\r?\n/)
      .map((line) => line.replace(/^\d+\.?\s*/, '').trim())
      .filter((line) => line.length > 0);

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
    });

    return emotionHistory;
  }
}
