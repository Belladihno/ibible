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
import { DailyVerseGeminiService } from './daily-verse-gemini.service';
import { DailyVerseConversation } from '../../../entities/daily-verse-conversation.entity';
import { DailyVerseConversationMessage } from '../../../entities/daily-verse-conversation-message.entity';

type MessageSender = 'user' | 'assistant';

export interface ConversationMetadata {
  id: string;
  userId: string;
  verseReference: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageInfo {
  id: string;
  content: string;
  createdAt: Date;
}

export interface MessagePair {
  user: MessageInfo | null;
  assistant: MessageInfo | null;
}

export interface StartConversationResponse {
  conversation: ConversationMetadata;
  aiMessage: DailyVerseConversationMessage;
}

export interface PostMessageResponse {
  conversation: ConversationMetadata;
  messagePairs: MessagePair[];
}

export interface ConversationHistoryResponse {
  conversation: ConversationMetadata;
  messagePairs: MessagePair[];
}

export interface ConversationSummary {
  id: string;
  verseReference: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  messagePairs: MessagePair[];
  lastPair: MessagePair | null;
}

interface GeminiHistoryEntry {
  role: string;
  content: string;
}

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
    private readonly dailyGemini: DailyVerseGeminiService,
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

    console.log('Cached Verse Data:', cached.verseData);
    return JSON.parse(cached.verseData) as BibleVerse;
  }

  async getDailyVerseWithSummary(): Promise<DailyVerseSummaryResponse> {
    const verse = await this.getDailyVerse();
    let summary: string;

    try {
      summary = await this.dailyGemini.summarizeVerse(verse);
    } catch (err) {
      this.logger.error('Failed to generate AI summary', err);
      summary = `Reflect on ${verse.reference}. What does this verse mean to you today?`;
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

  async startConversationForUser(
    userId: string,
  ): Promise<StartConversationResponse> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const verse = await this.getDailyVerse();
    const full = await this.dailyGemini.summarizeVerse(verse);

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
    const conv = await this.conversationRepo.findOne({
      where: { id: conversationId },
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

    const historyEntities = await this.messageRepo.find({
      where: { conversation: { id: conv.id } },
      order: { createdAt: 'ASC' },
    });

    const history: GeminiHistoryEntry[] = historyEntities.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      content: m.content,
    }));

    const aiReply = await this.dailyGemini.generateReply(content, history);
    const verseReference = conv.verseReference; // e.g., "John 3:16"

    const dailyVerse = await this.getDailyVerse();
    const verseContext = {
      reference: verseReference,
      text: dailyVerse.text,
    };

    const aiMsg = this.messageRepo.create({
      conversation: conv,
      sender: 'assistant' as MessageSender,
      content: aiReply,
    });
    await this.messageRepo.save(aiMsg);

    // Get all messages and build pairs
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

      const today = this.getToday();

      // Delete old verses (optional cleanup)
      await this.dailyVerseRepo.delete({
        date: this.getYesterday(),
      });

      // Save new verse
      await this.dailyVerseRepo.save({
        date: today,
        reference: verse.reference,
        verseData: JSON.stringify(verse),
      });

      this.logger.log(
        `Cached new daily verse: ${verse.reference} for ${today}`,
      );
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