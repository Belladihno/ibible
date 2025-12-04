import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DailyVerse } from 'src/entities/bible-verse.entity';
import { BibleVersion } from 'src/entities/bible-version.entity';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import {
  BibleVerse,
  DailyVerseSummaryResponse,
  DailyVerseWithSummary,
} from 'src/shared/types/bible-verse.types';
import { DailyVerseGeminiService } from './daily-verse-gemini.service';
import { DailyVerseConversation } from '../../../entities/daily-verse-conversation.entity';
import { DailyVerseConversationMessage } from '../../../entities/daily-verse-conversation-message.entity';
import { ConfigService } from '@nestjs/config';

// --- NEW INTERFACE FOR RANDOMNESS HELPERS ---
interface BibleBook {
  id: string; // e.g., 'MAT'
  name: string; // e.g., 'Matthew'
  chapters: { id: string; number: string }[];
}

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

// NOTE: Hardcoded key moved to be managed via ConfigService/constructor
const FALLBACK_REFERENCE = 'MAT.5.3';

@Injectable()
export class BibleVerseService implements OnModuleInit {
  forceRefresh(): void {
    throw new Error('Method not implemented.');
  }

  private readonly logger = new Logger(BibleVerseService.name);

  private readonly BASE_URL: string;
  private readonly DEFAULT_BIBLE_ID = 'de4e12af7f28f599-01';
  private readonly BIBLE_API_KEY: string;
  private readonly FALLBACK_REFERENCE = FALLBACK_REFERENCE;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(DailyVerse)
    private readonly dailyVerseRepo: Repository<DailyVerse>,
    @InjectRepository(BibleVersion)
    private readonly bibleVersionRepo: Repository<BibleVersion>,
    @InjectRepository(DailyVerseConversation)
    private readonly conversationRepo: Repository<DailyVerseConversation>,
    @InjectRepository(DailyVerseConversationMessage)
    private readonly messageRepo: Repository<DailyVerseConversationMessage>,
    private readonly httpService: HttpService,
    private readonly dailyGemini: DailyVerseGeminiService,
  ) {
    this.BASE_URL = this.config.get<string>('BIBLE_API_BASE_URL')!;
    this.BIBLE_API_KEY = this.config.get<string>('BIBLE_API_KEY')!;
    if (!this.BIBLE_API_KEY) {
      this.logger.error('BIBLE_API_KEY is not set in environment variables.');
    }
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBibleVersions();
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
      throw new InternalServerErrorException(
        'Failed to retrieve daily verse, cache is empty.',
      );
    }

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
      data: data,
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

    // Save user message
    const userMsg = this.messageRepo.create({
      conversation: conv,
      sender: 'user' as MessageSender,
      content,
    });
    await this.messageRepo.save(userMsg);

    // Fetch conversation history
    const historyEntities = await this.messageRepo.find({
      where: { conversation: { id: conv.id } },
      order: { createdAt: 'ASC' },
    });

    const history: GeminiHistoryEntry[] = historyEntities.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      content: m.content,
    }));

    // ✅ FIX: Extract verse info from conversation and pass it to generateReply
    // Parse the verse reference from conversation title or verseReference field
    const verseReference = conv.verseReference; // e.g., "John 3:16"

    // Get the actual daily verse to extract the text
    const dailyVerse = await this.getDailyVerse();

    // Create verse context object
    const verseContext = {
      reference: verseReference,
      text: dailyVerse.text,
    };

    // ✅ CRITICAL: Pass verse context to generateReply
    const aiReply = await this.dailyGemini.generateReply(
      content,
      history,
      verseContext, // 🎯 THIS IS THE KEY FIX
    );

    // Save AI response
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

    const summaries: ConversationSummary[] = await Promise.all(
      convs.map(async (c) => {
        const msgs = await this.messageRepo.find({
          where: { conversation: { id: c.id } },
          order: { createdAt: 'ASC' },
        });

        const messagePairs = this.buildMessagePairs(msgs);
        const lastPair =
          messagePairs.length > 0
            ? messagePairs[messagePairs.length - 1]
            : null;

        return {
          id: c.id,
          verseReference: c.verseReference,
          isActive: c.isActive,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          messagePairs: messagePairs,
          lastPair,
        };
      }),
    );

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

    const msgs = await this.messageRepo.find({
      where: { conversation: { id: conv.id } },
      order: { createdAt: 'ASC' },
    });

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

  private getApiHeaders() {
    if (!this.BIBLE_API_KEY) {
      throw new InternalServerErrorException('BIBLE_API_KEY is missing.');
    }
    return {
      headers: {
        'api-key': this.BIBLE_API_KEY,
      },
    };
  }

  private async ensureBibleVersions(): Promise<void> {
    const count = await this.bibleVersionRepo.count();
    if (count === 0) {
      this.logger.log('No Bible versions cached. Fetching from API...');
      await this.fetchAndCacheBibleVersions();
    }
  }

  private async fetchAndCacheBibleVersions(): Promise<void> {
    try {
      const url = `${this.BASE_URL}bibles`;
      const response = await firstValueFrom(
        this.httpService.get(url, this.getApiHeaders()),
      );

      const versions = response.data.data;

      const entities = versions.map((v) =>
        this.bibleVersionRepo.create({
          id: v.id,
          name: v.name,
          abbreviation: v.abbreviation,
          languageCode: v.language.id,
          languageName: v.language.name,
        }),
      );

      await this.bibleVersionRepo.save(entities);
      this.logger.log(`Successfully cached ${entities.length} Bible versions.`);
    } catch (error) {
      this.logger.error(
        'Failed to fetch and cache Bible versions',
        error.message,
      );
      throw new InternalServerErrorException(
        'Failed to initialize Bible versions from API.',
      );
    }
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
    const bibleId = this.DEFAULT_BIBLE_ID;
    let randomVerseId: string;

    try {
      const cachedTranslation = await this.bibleVersionRepo.findOne({
        where: { id: bibleId },
      });

      if (!cachedTranslation) {
        throw new InternalServerErrorException(
          `Bible version ID ${bibleId} not found in local cache.`,
        );
      }

      try {
        randomVerseId = await this.findRandomVerseId(bibleId);
      } catch (e) {
        this.logger.warn(
          `Random verse fetch failed. Falling back to: ${this.FALLBACK_REFERENCE}`,
        );
        randomVerseId = this.FALLBACK_REFERENCE;
      }

      this.logger.log(
        `Fetching verse content for ${randomVerseId} from Bible Version: ${cachedTranslation.name}`,
      );

      const verseUrl = `${this.BASE_URL}bibles/${bibleId}/verses/${randomVerseId}?content-type=text`;

      const response = await firstValueFrom(
        this.httpService.get(verseUrl, this.getApiHeaders()),
      );

      const verseData = response.data.data;

      const referenceString = verseData.reference;
      const parts = referenceString.split(' ');
      const bookName = parts[0];

      const chapterAndVerse = parts[1].split(':');
      const chapterNumber = chapterAndVerse[0];
      const verseNumber = chapterAndVerse[1];

      const cleanedText = verseData.content
        .replace(/\[\s*\d+\s*\]\s*/, '')
        .trim();

      const verse: BibleVerse = {
        id: verseData.id,
        reference: referenceString,
        book: bookName,
        chapter: chapterNumber,
        verse: verseNumber,
        text: cleanedText,
        translation: {
          identifier: cachedTranslation.id,
          name: cachedTranslation.name,
          language: cachedTranslation.languageName,
          language_code: cachedTranslation.languageCode,
          license: 'Open Access',
        },
      };

      const today = this.getToday();

      await this.dailyVerseRepo.delete({ date: this.getYesterday() });

      await this.dailyVerseRepo.save({
        date: today,
        reference: verse.reference,
        verseData: JSON.stringify(verse),
      });

      this.logger.log(
        `Cached new daily verse: ${verse.reference} (${bibleId}) for ${today}`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to fetch and cache verse from new API',
        error.message,
      );
      throw new InternalServerErrorException(
        'Failed to fetch daily verse from external API.',
      );
    }
  }

  private async findRandomVerseId(bibleId: string): Promise<string> {
    const books = await this.fetchBooks(bibleId);
    if (books.length === 0) {
      throw new Error('No books found for this Bible ID.');
    }

    const randomBook = books[Math.floor(Math.random() * books.length)];

    const randomChapter =
      randomBook.chapters[
        Math.floor(Math.random() * randomBook.chapters.length)
      ];

    const verses = await this.fetchChapterVerses(bibleId, randomChapter.id);
    if (verses.length === 0) {
      throw new Error(`No verses found in chapter ${randomChapter.id}`);
    }

    const randomVerse = verses[Math.floor(Math.random() * verses.length)];

    return randomVerse.id;
  }

  private async fetchBooks(bibleId: string): Promise<BibleBook[]> {
    const url = `${this.BASE_URL}bibles/${bibleId}/books?include-chapters=true`;

    const response = await firstValueFrom(
      this.httpService.get(url, this.getApiHeaders()),
    );

    return response.data.data;
  }

  private async fetchChapterVerses(
    bibleId: string,
    chapterId: string,
  ): Promise<{ id: string }[]> {
    const url = `${this.BASE_URL}bibles/${bibleId}/chapters/${chapterId}/verses`;

    const response = await firstValueFrom(
      this.httpService.get(url, this.getApiHeaders()),
    );

    return response.data.data;
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

  private getToday(): string {
    const now = new Date(Date.now());
    return now.toISOString().split('T')[0];
  }

  private getYesterday(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
}
