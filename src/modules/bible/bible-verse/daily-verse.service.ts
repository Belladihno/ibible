import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DailyVerse } from 'src/entities/bible-verse.entity';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import {
  BibleVerse,
  BibleApiResponse,
  DailyVerseSummaryResponse,
  DailyVerseWithSummary,
} from 'src/shared/types/bible-verse.types';
import { DailyVerseConversation } from '../../../entities/daily-verse-conversation.entity';
import { DailyVerseConversationMessage } from '../../../entities/daily-verse-conversation-message.entity';
import { GeminiService } from 'src/modules/gemini/gemini.service';
import {
  ConversationHistoryResponse,
  ConversationMetadata,
  ConversationSummary,
  MessagePair,
  PostMessageResponse,
  StartConversationResponse,
} from 'src/shared/interfaces/daily-verse.interface';
import { ChatRole, ReaFeature } from 'src/shared/enums';
import { ChatMessage } from 'src/shared/types/chat.types';

type MessageSender = 'user' | 'assistant';

@Injectable()
export class BibleVerseService implements OnModuleInit {
  forceRefresh(): void {
    throw new Error('Method not implemented.');
  }

  private readonly logger = new Logger(BibleVerseService.name);
  private readonly API_URL = 'https://bible-api.com/data/kjv/random';

  constructor(
    @InjectRepository(DailyVerse)
    private readonly dailyVerseRepo: Repository<DailyVerse>,
    @InjectRepository(DailyVerseConversation)
    private readonly conversationRepo: Repository<DailyVerseConversation>,
    @InjectRepository(DailyVerseConversationMessage)
    private readonly messageRepo: Repository<DailyVerseConversationMessage>,
    private readonly httpService: HttpService,
    private readonly geminiService: GeminiService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Fetch verse on startup if not cached for today
    await this.ensureDailyVerse();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshDailyVerse(): Promise<void> {
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

    this.logger.debug('Retrieved cached verse data', {
      verseData: cached.verseData,
    });
    return JSON.parse(cached.verseData) as BibleVerse;
  }

  async getDailyVerseWithSummary(): Promise<DailyVerseSummaryResponse> {
    await this.ensureDailyVerse();
    const today = this.getToday();
    const cached = await this.dailyVerseRepo.findOne({
      where: { date: today },
    });

    if (!cached) throw new Error('Failed to retrieve daily verse');

    const verse = JSON.parse(cached.verseData) as BibleVerse;

    let summary: string;

    if (cached.aiSummary) {
      summary = cached.aiSummary;
      this.logger.debug('Using cached AI summary');
    } else {
      this.logger.warn('AI summary missing, generating on-demand...');
      try {
        summary = await this.generateAISummary(verse);
        cached.aiSummary = summary;
        await this.dailyVerseRepo.save(cached);
      } catch (err) {
        this.logger.error('Failed to generate AI summary', err);
        summary = `Reflect on ${verse.reference}. What does this verse mean to you today?`;
      }
    }

    const data: DailyVerseWithSummary = {
      verse,
      summary,
      verseId: verse.id ?? '',
      timestamp: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      message: 'Request successful',
      data,
    };
  }

  private async generateAISummary(
    verse: BibleVerse,
    userId?: string,
  ): Promise<string> {
    try {
      return await this.geminiService.generate(ReaFeature.BIBLE, verse.text, {
        systemPrompt: `Summarize this Bible verse in 1-2 sentences, biblically accurate: ${verse.reference}`,
        temperature: 0.7,
        maxTokens: 120,
        userId,
      });
    } catch (err) {
      this.logger.error('GeminiService failed to generate summary', err);
      return `Reflect on ${verse.reference}. What does this verse mean to you today?`;
    }
  }

  private async generateAIReply(
    content: string,
    history: ChatMessage[],
    userId?: string,
  ): Promise<string> {
    try {
      return await this.geminiService.generate(ReaFeature.BIBLE, content, {
        systemPrompt: `
          You are Rea, a Bible-focused assistant.
          Respond thoughtfully, biblically, and conversationally.
        `.trim(),
        history,
        temperature: 0.7,
        maxTokens: 400,
        userId,
      });
    } catch (err) {
      this.logger.error('GeminiService failed to generate reply', err);
      return "Let's reflect on the verse together. What comes to your mind?";
    }
  }

  async startConversationForUser(
    userId: string,
  ): Promise<StartConversationResponse> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const verse = await this.getDailyVerse();
    const full = await this.generateAISummary(verse, userId);

    const conv = this.conversationRepo.create({
      userId,
      title: `Daily Verse: ${verse.reference}`,
      verseReference: verse.reference,
      messages: [],
      isActive: true,
    });

    const saved = await this.conversationRepo.save(conv);

    const aiMessage = this.messageRepo.create({
      conversation: saved,
      sender: 'assistant' as MessageSender,
      content: full.trim(),
    });

    await this.messageRepo.save(aiMessage);

    const conversation: ConversationMetadata = {
      id: saved.id,
      userId: saved.userId,
      verseReference: saved.verseReference,
      isActive: saved.isActive,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };

    return {
      conversation,
      aiMessage,
    };
  }

  async postMessageToConversation(
    conversationId: string,
    userId: string,
    content: string,
  ): Promise<PostMessageResponse> {
    // 1️⃣ Fetch conversation
    const conv = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['messages'], // Include messages for history
    });

    if (!conv) {
      throw new BadRequestException('Conversation not found');
    }

    if (conv.userId !== userId) {
      throw new BadRequestException('Not allowed');
    }
    const userMsg = this.messageRepo.create({
      conversation: conv,
      sender: 'user' as MessageSender,
      content,
    });
    await this.messageRepo.save(userMsg);
    const historyEntities = (conv.messages || []).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    const history: ChatMessage[] = historyEntities.map((m) => ({
      role: m.sender === 'user' ? ChatRole.USER : ChatRole.ASSISTANT,
      content: m.content,
    }));

    let aiReply: string;
    try {
      aiReply = await this.geminiService.generate(ReaFeature.BIBLE, content, {
        systemPrompt: `
        You are Rea, a Bible-focused Christian assistant.
        Respond thoughtfully, biblically, and conversationally.
      `.trim(),
        history,
        temperature: 0.7,
        maxTokens: 400,
        userId,
      });
    } catch (err) {
      this.logger.error('Failed to generate AI reply', err);
      aiReply = `Reflect on ${conv.verseReference}. What does this verse mean to you today?`;
    }

    // 5️⃣ Save AI message
    const aiMsg = this.messageRepo.create({
      conversation: conv,
      sender: 'assistant' as MessageSender,
      content: aiReply,
    });
    await this.messageRepo.save(aiMsg);

    // 6️⃣ Build message pairs
    const allMessages = await this.messageRepo.find({
      where: { conversation: { id: conv.id } },
      order: { createdAt: 'ASC' },
    });

    const messagePairs = this.buildMessagePairs(allMessages);

    const conversationMetadata: ConversationMetadata = {
      id: conv.id,
      userId: conv.userId,
      verseReference: conv.verseReference,
      isActive: conv.isActive,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };

    return {
      conversation: conversationMetadata,
      messagePairs,
    };
  }

  async listConversationsForUser(
    userId: string,
  ): Promise<ConversationSummary[]> {
    const convs = await this.conversationRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });

    const summaries: ConversationSummary[] = convs.map((c) => {
      const msgs = (c.messages || [])
        .slice()
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );

      const messagePairs = this.buildMessagePairs(msgs);
      const lastPair =
        messagePairs.length > 0 ? messagePairs[messagePairs.length - 1] : null;

      return {
        id: c.id,
        verseReference: c.verseReference,
        isActive: c.isActive,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messagePairs,
        lastPair,
      };
    });

    return summaries;
  }

  async getConversationHistory(
    conversationId: string,
    userId: string,
  ): Promise<ConversationHistoryResponse> {
    const conv = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });

    if (!conv) {
      throw new BadRequestException('Conversation not found');
    }

    if (conv.userId !== userId) {
      throw new BadRequestException('Not allowed');
    }

    const msgs = (conv.messages || [])
      .slice()
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    const messagePairs = this.buildMessagePairs(msgs);

    const conversation: ConversationMetadata = {
      id: conv.id,
      userId: conv.userId,
      verseReference: conv.verseReference,
      isActive: conv.isActive,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };

    return {
      conversation,
      messagePairs,
    };
  }

  private buildMessagePairs(
    messages: DailyVerseConversationMessage[],
  ): MessagePair[] {
    const messagePairs: MessagePair[] = [];

    for (const m of messages) {
      if (m.sender === 'user') {
        messagePairs.push({
          user: { id: m.id, content: m.content, createdAt: m.createdAt },
          assistant: null,
        });
      } else {
        if (messagePairs.length === 0) {
          messagePairs.push({
            user: null,
            assistant: { id: m.id, content: m.content, createdAt: m.createdAt },
          });
        } else {
          const last = messagePairs[messagePairs.length - 1];
          if (!last.assistant) {
            last.assistant = {
              id: m.id,
              content: m.content,
              createdAt: m.createdAt,
            };
          } else {
            last.assistant.content = `${last.assistant.content}\n\n${m.content}`;
          }
        }
      }
    }

    return messagePairs;
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
    const today = this.getToday();

    // Check if verse already exists for today
    const existingVerse = await this.dailyVerseRepo.findOne({
      where: { date: today },
    });

    if (existingVerse) {
      this.logger.debug(
        `Daily verse already exists for ${today}, skipping cache`,
      );
      return;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<BibleApiResponse>(this.API_URL),
      );

      const apiResponse = response.data;
      const verse: BibleVerse = {
        reference: `${apiResponse.random_verse.book} ${apiResponse.random_verse.chapter}:${apiResponse.random_verse.verse}`,
        book: apiResponse.random_verse.book,
        chapter: apiResponse.random_verse.chapter,
        verse: apiResponse.random_verse.verse,
        text: apiResponse.random_verse.text,
        translation: apiResponse.translation,
      };

      let aiSummary: string | null = null;
      try {
        aiSummary = await this.generateAISummary(verse, undefined);
        this.logger.log(`Generated AI summary for ${verse.reference}`);
      } catch (err) {
        this.logger.error('Failed to generate AI summary during caching', err);
        aiSummary = `Reflect on ${verse.reference}. What does this verse mean to you today?`;
      }

      // Use upsert-like operation with error handling for race conditions
      try {
        await this.dailyVerseRepo.save({
          date: today,
          reference: verse.reference,
          verseData: JSON.stringify(verse),
          aiSummary,
        });

        this.logger.log(
          `Cached new daily verse: ${verse.reference} for ${today}`,
        );

        // Clean up old verses after successful save
        await this.dailyVerseRepo.delete({
          date: this.getYesterday(),
        });
      } catch (saveError: any) {
        // Handle potential race condition - check if another process already saved it
        if (
          saveError.code === '23505' ||
          saveError.message?.includes('duplicate key')
        ) {
          this.logger.warn(
            `Race condition detected: Daily verse for ${today} was already saved by another process`,
          );
          // Verify the verse exists
          const verifyVerse = await this.dailyVerseRepo.findOne({
            where: { date: today },
          });
          if (verifyVerse) {
            this.logger.debug(`Confirmed existing verse for ${today}`);
            return;
          }
        }
        // Re-throw if it's not a duplicate key error
        throw saveError;
      }
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
