import { Injectable } from '@nestjs/common';
import { MeditationPlan } from 'src/entities/meditation-plan.entity';
import { MeditationSession } from 'src/entities/meditation-session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MeditationHistoryDto } from './dto/meditation-history.dto';
import { UpdateMeditationPreferencesDto } from './dto/update-preferences.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { CompleteSessionDto } from './dto/complete-session.dto';
import { MeditationVerseService } from './meditation-verse.service';
import * as SystemMessages from 'src/shared/constants/systemMessages';
import { MeditationChat } from 'src/entities/meditation-chat.entity';
import { ReflectionGeminiService } from './services/meditation-gemini-service';
@Injectable()
export class MeditationService {
  constructor(
    @InjectRepository(MeditationPlan)
    private meditationPlanRepo: Repository<MeditationPlan>,
    @InjectRepository(MeditationSession)
    private meditationSessionRepo: Repository<MeditationSession>,
    @InjectRepository(MeditationChat)
    private chatRepo: Repository<MeditationChat>,
    private readonly meditationVerseService: MeditationVerseService,
    private readonly reflectionGeminiService: ReflectionGeminiService,
  ) {}

  async getDailyMeditation(userId: string) {
    const plan = await this.getOrCreatePlan(userId);

    const verseData = await this.getTodaysVerse();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySessions = await this.meditationSessionRepo.find({
      where: {
        userId,
        startedAt: Between(today, tomorrow),
        completed: true,
      },
    });

    const streak = await this.calculateStreak(userId);

    return {
      plan: {
        morningTime: plan.morningTime,
        eveningTime: plan.eveningTime,
        morningEnabled: plan.morningEnabled,
        eveningEnabled: plan.eveningEnabled,
        durationMinutes: plan.durationMinutes,
      },
      verse: verseData,
      todayCompleted: todaySessions.length > 0,
      completedSessions: todaySessions.length,
      streak,
    };
  }

  async startSession(userId: string, dto: StartSessionDto) {
    const plan = await this.getOrCreatePlan(userId);
    const verseData = await this.getTodaysVerse();

    const session = this.meditationSessionRepo.create({
      userId,
      startedAt: new Date(),
      sessionType: dto.sessionType || 'morning',
      verseReference: verseData.reference,
      verseText: verseData.text,
      completed: false,
      initialReflection: dto.initialReflection || null,
      chatCount: 0,
    });

    await this.meditationSessionRepo.save(session);

    let initialChatMessage: string | null = null;

    if (dto.initialReflection) {
      await this.chatRepo.save({
        sessionId: session.id,
        userId,
        role: 'user',
        message: dto.initialReflection,
      });

      const aiGreeting = await this.reflectionGeminiService.generateReflection({
        verseReference: verseData.reference,
        verseText: verseData.text,
        userReflection: dto.initialReflection,
      });

      await this.chatRepo.save({
        sessionId: session.id,
        userId,
        role: 'assistant',
        message: aiGreeting,
      });

      session.chatCount = 2;
      await this.meditationSessionRepo.save(session);

      initialChatMessage = aiGreeting;
    }

    return {
      sessionId: session.id,
      startedAt: session.startedAt,
      durationMinutes: plan.durationMinutes,
      verse: verseData,
      initialChatMessage,
    };
  }

  async sendChatMessage(userId: string, sessionId: string, message: string) {
    const session = await this.meditationSessionRepo.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.chatRepo.save({
      sessionId,
      userId,
      role: 'user',
      message,
    });

    const history = await this.chatRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });

    const aiResponse =
      await this.reflectionGeminiService.generateContinuedReflection({
        verseReference: session.verseReference,
        verseText: session.verseText,
        history: history.map((h) => ({
          role: h.role,
          message: h.message,
        })),
        newUserMessage: message,
      });

    await this.chatRepo.save({
      sessionId,
      userId,
      role: 'assistant',
      message: aiResponse,
    });

    session.chatCount = history.length + 2;
    await this.meditationSessionRepo.save(session);

    return {
      reply: aiResponse,
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
    const durationSeconds = Math.floor(
      (now.getTime() - session.startedAt.getTime()) / 1000,
    );

    session.completedAt = now;
    session.durationSeconds = durationSeconds;
    session.completed = true;
    session.notes = dto.notes || null;

    await this.meditationSessionRepo.save(session);

    // Calculate new streak
    const streak = await this.calculateStreak(userId);

    // Check for milestone
    await this.checkStreakMilestone(userId, streak);

    return {
      message: SystemMessages.SESSION_COMPLETED,
      sessionId: session.id,
      completedAt: session.completedAt,
      durationSeconds: session.durationSeconds,
      streak,
    };
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

  async getHistory(userId: string, dto: MeditationHistoryDto) {
    const { page = 1, limit = 20, startDate, endDate } = dto;
    const skip = (page - 1) * limit;

    const whereCondition: any = { userId };

    if (startDate || endDate) {
      whereCondition.createdAt = Between(
        startDate ? new Date(startDate) : new Date('1970-01-01'),
        endDate ? new Date(endDate) : new Date(),
      );
    }

    const [sessions, total] = await this.meditationSessionRepo.findAndCount({
      where: whereCondition,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const sessionsWithPreviews = await Promise.all(
      sessions.map(async (session) => {
        const lastChat = await this.chatRepo.findOne({
          where: { sessionId: session.id },
          order: { createdAt: 'DESC' },
        });

        return {
          ...session,
          chatPreview: lastChat
            ? lastChat.message.substring(0, 100) + '...'
            : null,
        };
      }),
    );

    return {
      data: sessionsWithPreviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updatePreferences(userId: string, dto: UpdateMeditationPreferencesDto) {
    let plan = await this.meditationPlanRepo.findOne({ where: { userId } });

    if (!plan) {
      plan = this.meditationPlanRepo.create({ userId });
    }

    Object.assign(plan, dto);
    await this.meditationPlanRepo.save(plan);

    return plan;
  }

  async getStreak(userId: string) {
    const streak = await this.calculateStreak(userId);
    const stats = await this.getStatistics(userId);

    return {
      currentStreak: streak,
      longestStreak: stats.longestStreak,
      totalDays: stats.totalDays,
    };
  }

  async getStatistics(userId: string) {
    const allSessions = await this.meditationSessionRepo.find({
      where: { userId, completed: true },
      order: { completedAt: 'ASC' },
    });

    const totalSessions = allSessions.length;
    const totalDurationSeconds = allSessions.reduce(
      (sum, s) => sum + (s.durationSeconds || 0),
      0,
    );

    // Calculate unique days
    const uniqueDays = new Set(
      allSessions.map((s) => s.completedAt.toISOString().split('T')[0]),
    ).size;

    // Calculate longest streak
    const longestStreak = this.calculateLongestStreak(allSessions);

    // Get last 30 days activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSessions = allSessions.filter(
      (s) => s.completedAt >= thirtyDaysAgo,
    );

    return {
      totalSessions,
      totalDays: uniqueDays,
      totalDurationSeconds,
      averageDurationSeconds:
        totalSessions > 0
          ? Math.floor(totalDurationSeconds / totalSessions)
          : 0,
      longestStreak,
      last30Days: recentSessions.length,
      currentStreak: await this.calculateStreak(userId),
    };
  }

  async calculateStreak(userId: string): Promise<number> {
    const sessions = await this.meditationSessionRepo.find({
      where: { userId, completed: true },
      order: { completedAt: 'DESC' },
    });

    if (sessions.length === 0) return 0;

    let streak = 0;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Check if there's a session today or yesterday (grace period)
    const lastSessionDate = new Date(sessions[0].completedAt);
    lastSessionDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (currentDate.getTime() - lastSessionDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (daysDiff > 1) {
      return 0; // Streak broken
    }

    // Count consecutive days
    const uniqueDates = Array.from(
      new Set(
        sessions.map((s) => {
          const d = new Date(s.completedAt);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        }),
      ),
    ).sort((a, b) => b - a);

    streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const diff =
        (uniqueDates[i - 1] - uniqueDates[i]) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private calculateLongestStreak(sessions: MeditationSession[]): number {
    if (sessions.length === 0) return 0;

    const uniqueDates = Array.from(
      new Set(
        sessions.map((s) => {
          const d = new Date(s.completedAt);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        }),
      ),
    ).sort((a, b) => a - b);

    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const diff =
        (uniqueDates[i] - uniqueDates[i - 1]) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return maxStreak;
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

      return {
        reference: verse.reference,
        text: verse.text,
      };
    } catch (error) {
      console.error('Failed to fetch meditation verse:', error);
      return {
        reference: 'Psalm 46:10',
        text: 'Be still, and know that I am God.',
      };
    }
  }

  private async checkStreakMilestone(userId: string, streak: number) {
    const milestones = [7, 30, 90, 365];

    if (milestones.includes(streak)) {
      // TODO: Integrate with Notifications Module
      console.log(` User ${userId} reached ${streak} day milestone!`);
    }
  }

  // Methods for cron jobs
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
}
