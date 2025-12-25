import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import { MeditationPlan } from 'src/entities/meditation-plan.entity';
import { MeditationSession } from 'src/entities/meditation-session.entity';
import { MeditationChat } from 'src/entities/meditation-chat.entity';

import { MeditationVerseService } from './meditation-verse.service';
import { GeminiService } from '../gemini/gemini.service';

import { MeditationHistoryDto } from './dto/meditation-history.dto';
import { UpdateMeditationPreferencesDto } from './dto/update-preferences.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { CompleteSessionDto } from './dto/complete-session.dto';

import { ChatRole, ReaFeature } from 'src/shared/enums';
import * as SystemMessages from 'src/shared/constants/systemMessages';

@Injectable()
export class MeditationService {
  private readonly logger = new Logger(MeditationService.name);

  constructor(
    @InjectRepository(MeditationPlan)
    private readonly meditationPlanRepo: Repository<MeditationPlan>,

    @InjectRepository(MeditationSession)
    private readonly meditationSessionRepo: Repository<MeditationSession>,

    @InjectRepository(MeditationChat)
    private readonly chatRepo: Repository<MeditationChat>,

    private readonly meditationVerseService: MeditationVerseService,
    private readonly gemini: GeminiService,
  ) {}

  /* ===================== DAILY MEDITATION ===================== */

  async getDailyMeditation(userId: string) {
    const plan = await this.getOrCreatePlan(userId);
    const verse = await this.getTodaysVerse();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todaySessions = await this.meditationSessionRepo.find({
      where: {
        userId,
        startedAt: Between(today, tomorrow),
        completed: true,
      },
    });

    return {
      plan: {
        morningTime: plan.morningTime,
        eveningTime: plan.eveningTime,
        morningEnabled: plan.morningEnabled,
        eveningEnabled: plan.eveningEnabled,
        durationMinutes: plan.durationMinutes,
      },
      verse,
      todayCompleted: todaySessions.length > 0,
      completedSessions: todaySessions.length,
      streak: await this.calculateStreak(userId),
    };
  }

  /* ===================== START SESSION ===================== */

  async startSession(userId: string, dto: StartSessionDto) {
    const plan = await this.getOrCreatePlan(userId);
    const verse = await this.getTodaysVerse();

    const session = this.meditationSessionRepo.create({
      userId,
      startedAt: new Date(),
      sessionType: dto.sessionType || 'morning',
      verseReference: verse.reference,
      verseText: verse.text,
      completed: false,
      initialReflection: dto.initialReflection ?? null,
      chatCount: 0,
    });

    await this.meditationSessionRepo.save(session);

    let initialChatMessage: string | null = null;

    if (dto.initialReflection) {
      await this.chatRepo.save({
        sessionId: session.id,
        userId,
        role: ChatRole.USER,
        message: dto.initialReflection,
      });

      const prompt = `
          You are a calm Christian meditation guide.

          Verse: ${verse.reference}
          "${verse.text}"

          User reflection:
          "${dto.initialReflection}"

          Respond with warmth, encouragement, and one reflective question.
      `.trim();
      const aiReply = await this.gemini.generate(
        ReaFeature.REFLECTION,
        prompt,
        { temperature: 0.6, maxTokens: 250, userId },
      );

      await this.chatRepo.save({
        sessionId: session.id,
        userId,
        role: ChatRole.ASSISTANT,
        message: aiReply,
      });

      session.chatCount = 2;
      await this.meditationSessionRepo.save(session);

      initialChatMessage = aiReply;
    }

    return {
      sessionId: session.id,
      startedAt: session.startedAt,
      durationMinutes: plan.durationMinutes,
      verse,
      initialChatMessage,
    };
  }

  async sendChatMessage(userId: string, sessionId: string, message: string) {
    const session = await this.meditationSessionRepo.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) throw new NotFoundException('Session not found');

    await this.chatRepo.save({
      sessionId,
      userId,
      role: ChatRole.USER,
      message,
    });

    const history = await this.chatRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });

    const historyText = history
      .map((h) => `${h.role}: ${h.message}`)
      .join('\n');

    const prompt = `
You are guiding a reflective Christian meditation.

Verse: ${session.verseReference}
"${session.verseText}"

Conversation so far:
${historyText}

User says:
"${message}"

Respond calmly, spiritually, and thoughtfully.
`;

    const aiReply = await this.gemini.generate(ReaFeature.REFLECTION, prompt, {
      temperature: 0.7,
      maxTokens: 300,
      userId,
    });

    await this.chatRepo.save({
      sessionId,
      userId,
      role: ChatRole.ASSISTANT,
      message: aiReply,
    });

    session.chatCount = history.length + 2;
    await this.meditationSessionRepo.save(session);

    return {
      reply: aiReply,
      timestamp: new Date(),
    };
  }

  async completeSession(userId: string, dto: CompleteSessionDto) {
    const session = await this.meditationSessionRepo.findOne({
      where: { id: dto.sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException(SystemMessages.SESSION_NOT_FOUND);
    }

    if (session.completed) {
      throw new BadRequestException(SystemMessages.SESSION_ALREADY_COMPLETED);
    }

    const now = new Date();
    session.completed = true;
    session.completedAt = now;
    session.durationSeconds = Math.floor(
      (now.getTime() - session.startedAt.getTime()) / 1000,
    );
    session.notes = dto.notes ?? null;

    await this.meditationSessionRepo.save(session);

    const streak = await this.calculateStreak(userId);
    await this.checkStreakMilestone(userId, streak);

    return {
      message: SystemMessages.SESSION_COMPLETED,
      sessionId: session.id,
      completedAt: session.completedAt,
      durationSeconds: session.durationSeconds,
      streak,
    };
  }

  async getHistory(userId: string, dto: MeditationHistoryDto) {
    const { page = 1, limit = 20, startDate, endDate } = dto;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (startDate || endDate) {
      where.createdAt = Between(
        startDate ? new Date(startDate) : new Date('1970-01-01'),
        endDate ? new Date(endDate) : new Date(),
      );
    }

    const [sessions, total] = await this.meditationSessionRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async getOrCreatePlan(userId: string): Promise<MeditationPlan> {
    let plan = await this.meditationPlanRepo.findOne({ where: { userId } });

    if (!plan) {
      plan = this.meditationPlanRepo.create({
        userId,
        morningTime: '06:00:00',
        eveningTime: '20:00:00',
        morningEnabled: true,
        eveningEnabled: false,
        durationMinutes: 10,
      });
      await this.meditationPlanRepo.save(plan);
    }

    return plan;
  }

  private async getTodaysVerse() {
    try {
      const verse = await this.meditationVerseService.getMeditationVerse();
      return { reference: verse.reference, text: verse.text };
    } catch {
      return {
        reference: 'Psalm 46:10',
        text: 'Be still, and know that I am God.',
      };
    }
  }

  private async calculateStreak(userId: string): Promise<number> {
    const sessions = await this.meditationSessionRepo.find({
      where: { userId, completed: true },
      order: { completedAt: 'DESC' },
    });

    if (!sessions.length) return 0;

    const uniqueDays = Array.from(
      new Set(
        sessions.map(
          (s) => new Date(s.completedAt).toISOString().split('T')[0],
        ),
      ),
    );

    let streak = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
      const diff =
        (new Date(uniqueDays[i - 1]).getTime() -
          new Date(uniqueDays[i]).getTime()) /
        (1000 * 60 * 60 * 24);
      if (diff === 1) streak++;
      else break;
    }

    return streak;
  }

  private async checkStreakMilestone(userId: string, streak: number) {
    if ([7, 30, 90, 365].includes(streak)) {
      this.logger.log(`User ${userId} reached ${streak}-day streak milestone`);
    }
  }

  async getUsersForMorningReminder(): Promise<
    Array<{ userId: string; verse: any }>
  > {
    const plans = await this.meditationPlanRepo.find({
      where: { morningEnabled: true, active: true },
    });

    const verse = await this.getTodaysVerse();

    return plans.map((plan) => ({
      userId: plan.userId,
      verse,
    }));
  }

  async getUsersForEveningReminder(): Promise<
    Array<{ userId: string; verse: any }>
  > {
    const plans = await this.meditationPlanRepo.find({
      where: { eveningEnabled: true, active: true },
    });

    const verse = await this.getTodaysVerse();

    return plans.map((plan) => ({
      userId: plan.userId,
      verse,
    }));
  }

  async getSessionById(userId: string, sessionId: string) {
    const session = await this.meditationSessionRepo.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const chatHistory = await this.chatRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });

    return {
      session: {
        id: session.id,
        verseReference: session.verseReference,
        verseText: session.verseText,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        durationSeconds: session.durationSeconds,
        completed: session.completed,
        initialReflection: session.initialReflection,
        chatCount: session.chatCount,
      },
      chatHistory: chatHistory.map((chat) => ({
        id: chat.id,
        role: chat.role,
        message: chat.message,
        createdAt: chat.createdAt,
      })),
    };
  }

  async updatePreferences(userId: string, dto: UpdateMeditationPreferencesDto) {
    let plan = await this.meditationPlanRepo.findOne({
      where: { userId },
    });

    if (!plan) {
      plan = this.meditationPlanRepo.create({ userId });
    }

    Object.assign(plan, dto);
    await this.meditationPlanRepo.save(plan);

    return plan;
  }
}
