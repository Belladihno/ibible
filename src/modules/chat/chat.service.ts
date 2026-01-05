import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  ILike,
  FindOptionsWhere,
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';
import { ChatConversation } from '../../entities/chat-conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageSender } from '../../shared/enums';
import { ChatContextService } from './services/chat-context.service';
import Redis from 'ioredis';
import { GeminiService } from '../gemini/gemini.service';
import { ChatRole, ReaFeature } from 'src/shared/enums';
import { ChatMessage as ChatMessageType } from 'src/shared/types/chat.types';
import * as SYS_MSG from '../../shared/constants/systemMessages';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatConversation)
    private chatConversationRepository: Repository<ChatConversation>,
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
    private gemini: GeminiService,
    private chatContextService: ChatContextService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async createConversation(
    userId: string,
    firstMessage?: string,
    generateTitle: boolean = true,
  ): Promise<ChatConversation> {
    let title = 'New Conversation';

    if (firstMessage) {
      title = this.getSimpleTitle(firstMessage);
    }
    // Make unique if needed
    const uniqueTitle = await this.makeTitleUnique(userId, title);

    const conversation = this.chatConversationRepository.create({
      userId,
      title: uniqueTitle,
      isActive: true,
    });

    const savedConversation =
      await this.chatConversationRepository.save(conversation);

    // run title generation in background
    if (firstMessage && generateTitle) {
      void this.generateTitleInBackground(
        savedConversation.id,
        firstMessage,
        userId,
      );
    }

    return savedConversation;
  }

  //Background task to generate and update title
  private async generateTitleInBackground(
    conversationId: string,
    message: string,
    userId: string,
  ) {
    try {
      // Small delay to let the initial request finish
      await new Promise((resolve) => setTimeout(resolve, 100));

      const title = await this.getAITitleWithTimeout(message, userId);
      const uniqueTitle = await this.makeTitleUnique(userId, title);

      await this.chatConversationRepository.update(
        { id: conversationId },
        { title: uniqueTitle },
      );

      this.logger.log(
        `Background: Updated title for ${conversationId} to "${uniqueTitle}"`,
      );
    } catch (error) {
      this.logger.warn(`Background title generation failed: ${error.message}`);
    }
  }

  /**
   * Get AI title with short timeout
   */
  private async getAITitleWithTimeout(
    userMessage: string,
    userId: string,
  ): Promise<string> {
    const prompt = `
      Generate a very short title (2–5 words) for this conversation.
      Do not use punctuation, quotes, or explanations.
      Return ONLY the title text.
      `.trim();
    const titlePromise: Promise<string> = this.gemini
      .generate(ReaFeature.TITLE, userMessage, {
        systemPrompt: prompt,
        temperature: 0.4,
        maxTokens: 20,
      })
      .then((res) => String(res.content));

    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('AI title timeout')), 2000);
    });

    return Promise.race([titlePromise, timeoutPromise]);
  }

  /**
   * Simple title for fallback
   */
  private getSimpleTitle(userMessage: string): string {
    const lowerMsg = userMessage.toLowerCase();

    // Quick topic detection
    if (lowerMsg.includes('prodigal son')) return 'The Prodigal Son';
    if (lowerMsg.includes('good samaritan')) return 'The Good Samaritan';
    if (lowerMsg.includes('david and goliath')) return 'David and Goliath';
    if (lowerMsg.includes('anxious') || lowerMsg.includes('anxiety'))
      return 'Anxiety Support';
    if (lowerMsg.includes('pray')) return 'Prayer';
    if (lowerMsg.includes('forgiv')) return 'Forgiveness';
    if (lowerMsg.includes('marriage') || lowerMsg.includes('spouse'))
      return 'Marriage';

    // Scripture reference
    const verseMatch = userMessage.match(/([1-3]?\s?[A-Z][a-z]+ \d+:\d+)/);
    if (verseMatch) return verseMatch[1];

    // First 4 meaningful words
    const words = userMessage
      .replace(/[^\w\s]/g, ' ')
      .split(' ')
      .filter((word) => word.length > 3)
      .slice(0, 4);

    if (words.length >= 2) {
      return words.join(' ');
    }

    return 'Bible Study';
  }

  /**
   * Main message handler
   */
  async sendMessage(userId: string, createMessageDto: CreateMessageDto) {
    // -------------------- FETCH OR CREATE CONVERSATION --------------------
    let conversation: ChatConversation;

    if (createMessageDto.conversationId) {
      const existing = await this.chatConversationRepository.findOne({
        where: {
          id: createMessageDto.conversationId,
          userId,
          isActive: true,
        },
        relations: ['messages'], // Load messages for context history
      });

      if (!existing) throw new NotFoundException('Conversation not found');
      conversation = existing;
    } else {
      conversation = await this.createConversation(
        userId,
        createMessageDto.content,
        false,
      );
      // Initialize messages array for new conversation
      conversation.messages = [];
    }

    // -------------------- ADD USER MESSAGE --------------------
    const userMessage = this.chatMessageRepository.create({
      sender: MessageSender.USER,
      content: createMessageDto.content,
      timestamp: new Date(),
      references: [],
      conversation: conversation,
    });

    await this.chatMessageRepository.save(userMessage);

    // Add to local array for AI context generation (to avoid re-fetching)
    if (!conversation.messages) conversation.messages = [];
    conversation.messages.push(userMessage);

    const scriptureReferences = this.extractScriptureReferences(
      createMessageDto.content,
    );

    // -------------------- BUILD SYSTEM PROMPT --------------------
    const systemPrompt = await this.chatContextService.buildContext(
      userId,
      conversation.id,
      createMessageDto.content,
    );

    // -------------------- GENERATE AI RESPONSE --------------------
    let aiResponseContent: string;

    try {
      let result = await this.gemini.generate(
        ReaFeature.CHAT,
        createMessageDto.content,
        {
          systemPrompt,
          temperature: 0.7,
          maxTokens: 3000,
          userId: userId,
        },
      );

      aiResponseContent = result.content;

      // Check for truncation and request continuation if needed
      let loopCount = 0;
      const MAX_LOOPS = 2; // Safety limit

      while (result.finishReason === 'length' && loopCount < MAX_LOOPS) {
        const continuation = await this.gemini.generate(
          ReaFeature.CHAT,
          'Please complete your previous response precisely starting from where you cut off.',
          {
            systemPrompt: systemPrompt,
            history: [
              { role: ChatRole.USER, content: createMessageDto.content },
              { role: ChatRole.ASSISTANT, content: aiResponseContent },
            ],
            temperature: 0.7,
            maxTokens: 1000,
            userId: userId,
          },
        );

        aiResponseContent += continuation.content;
        result = continuation;
        loopCount++;
      }

      // Generate AI title for new conversation in BACKGROUND
      // We don't await this to make sure the user gets their response faster
      if (!createMessageDto.conversationId) {
        try {
          const aiTitle = await this.getAITitleWithTimeout(
            createMessageDto.content,
            userId,
          );
          conversation.title = aiTitle;
          await this.chatConversationRepository.save(conversation);
          this.logger.log(`Updated conversation title to: "${aiTitle}"`);
        } catch (error) {
          this.logger.warn(`AI title update failed: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error('AI response error:', error);
      aiResponseContent = this.getFallbackResponse(
        createMessageDto.content,
        scriptureReferences,
      );
    }

    // Ensure AI response is not empty
    if (!aiResponseContent || aiResponseContent.trim() === '') {
      aiResponseContent = this.getFallbackResponse(
        createMessageDto.content,
        scriptureReferences,
      );
    }

    // Extract references from AI response
    const aiResponseReferences =
      this.extractScriptureReferences(aiResponseContent);

    // -------------------- ADD AI MESSAGE --------------------
    const aiMessage = this.chatMessageRepository.create({
      sender: MessageSender.AI,
      content: aiResponseContent,
      timestamp: new Date(),
      references: [
        ...new Set([...scriptureReferences, ...aiResponseReferences]),
      ],
      conversation: conversation,
    });

    await this.chatMessageRepository.save(aiMessage);
    conversation.messages.push(aiMessage);

    return conversation;
  }

  /**
   * Make title unique for user
   */
  private async makeTitleUnique(
    userId: string,
    baseTitle: string,
  ): Promise<string> {
    try {
      const existing = await this.chatConversationRepository.findOne({
        where: { userId, title: baseTitle },
      });

      if (!existing) return baseTitle;

      // Find numbered versions
      const escapedTitle = baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // For SQL, we use ILike or checks.
      // We will look for anything starting with the title and ending with a number in parenthesis
      const similarTitles = await this.chatConversationRepository.find({
        where: {
          userId,
          title: ILike(`${baseTitle}%`), // Fetch strict subset to avoid massive scan
        },
      });

      // Filter in memory for precise regex matching
      const pattern = new RegExp(`^${escapedTitle}\\s*\\(\\d+\\)$`, 'i');

      let maxNum = 1;
      const numPattern = /\((\d+)\)$/;

      similarTitles.forEach((doc) => {
        if (pattern.test(doc.title)) {
          const match = doc.title.match(numPattern);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      });

      return `${baseTitle} (${maxNum + 1})`;
    } catch (error) {
      return baseTitle;
    }
  }

  /**
   * Fallback response generator
   */
  private getFallbackResponse(
    userMessage: string,
    references: string[],
  ): string {
    if (references.length > 0) {
      return `I noticed you mentioned ${references.join(' and ')}. I'm working on providing the full text of these verses soon.`;
    }

    if (
      userMessage.toLowerCase().includes('anxiety') ||
      userMessage.toLowerCase().includes('anxious') ||
      userMessage.toLowerCase().includes('worry')
    ) {
      return "It sounds like you're facing a challenging time. Philippians 4:6-7 says: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.'";
    }

    return "Hello! I'm Rea, your Bible-focused AI companion. I can help you explore Bible verses and topics. What would you like to learn about today?";
  }

  /**
   * Search conversations by title
   */
  async searchConversationsByTitle(
    userId: string,
    searchQuery: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [conversations, total] =
      await this.chatConversationRepository.findAndCount({
        where: {
          userId,
          title: ILike(`%${searchQuery}%`),
          isActive: true,
        },
        order: { updatedAt: 'DESC' },
        skip,
        take: limit,
      });

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      conversations,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null,
      },
      searchInfo: {
        query: searchQuery,
        resultsCount: conversations.length,
      },
    };
  }

  /**
   * Advanced search with multiple criteria
   */
  async searchConversations(
    userId: string,
    criteria: {
      title?: string;
      startDate?: Date;
      endDate?: Date;
      hasReferences?: boolean;
    },
    page: number = 1,
    limit: number = 20,
  ) {
    this.logger.debug(`🔍 Advanced search for user ${userId}`, {
      criteria,
      page,
      limit,
    });

    const validatedLimit = Math.min(limit, 100);
    const validatedPage = Math.max(page, 1);
    const skip = (validatedPage - 1) * validatedLimit;

    // Start with QueryBuilder for flexibility
    const qb =
      this.chatConversationRepository.createQueryBuilder('conversation');
    qb.where('conversation.userId = :userId', { userId });
    qb.andWhere('conversation.isActive = :isActive', { isActive: true });

    if (criteria.title && criteria.title.trim().length > 0) {
      qb.andWhere('conversation.title ILIKE :title', {
        title: `%${criteria.title.trim()}%`,
      });
    }

    if (criteria.startDate) {
      qb.andWhere('conversation.createdAt >= :startDate', {
        startDate: criteria.startDate,
      });
    }

    if (criteria.endDate) {
      const endOfDay = new Date(criteria.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      qb.andWhere('conversation.createdAt <= :endDate', { endDate: endOfDay });
    }

    if (criteria.hasReferences !== undefined) {
      if (criteria.hasReferences) {
        // Use inner join to find conversations with at least one message that has references
        // array_length is Postgres specific
        qb.innerJoin(
          'conversation.messages',
          'refMsg',
          'cardinality(refMsg.references) > 0',
        );
      } else {
        // Ensure no messages have references
        qb.andWhere((subQb) => {
          const subQuery = subQb
            .subQuery()
            .select('1')
            .from(ChatMessage, 'm')
            .where('m.conversationId = conversation.id')
            .andWhere('cardinality(m.references) > 0')
            .getQuery();
          return `NOT EXISTS ${subQuery}`;
        });
      }
    }

    qb.orderBy('conversation.updatedAt', 'DESC');
    qb.skip(skip);
    qb.take(validatedLimit);

    try {
      const startTime = Date.now();

      const [conversations, total] = await qb.getManyAndCount();

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Search executed in ${executionTime}ms, found ${conversations.length} of ${total} total conversations`,
      );

      const totalPages = Math.ceil(total / validatedLimit);

      const result = {
        conversations,
        pagination: {
          total,
          page: validatedPage,
          limit: validatedLimit,
          totalPages,
          hasNextPage: validatedPage < totalPages,
          hasPrevPage: validatedPage > 1,
          nextPage: validatedPage < totalPages ? validatedPage + 1 : null,
          prevPage: validatedPage > 1 ? validatedPage - 1 : null,
        },
      };

      return result;
    } catch (error) {
      this.logger.error('Search failed:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  // ==================== EXISTING METHODS ====================

  private extractScriptureReferences(content: string): string[] {
    // Split content into words
    const words = content.split(/\s+/);

    const references: string[] = [];

    for (let i = 0; i < words.length; i++) {
      let word = words[i];
      word = word.replace(/^[^\w\d]+|[^\w\d]+$/g, '');
      let bookName = word;

      if (/^[1-3]$/.test(word) && words[i + 1]) {
        bookName = `${word} ${words[i + 1].replace(/^[^\w\d]+|[^\w\d]+$/g, '')}`;
        i++;
      }

      const nextWord = words[i + 1] || '';
      const chapterVerseMatch = nextWord.match(/^(\d+):(\d+(?:-\d+)?)$/);
      if (chapterVerseMatch) {
        references.push(
          `${bookName} ${chapterVerseMatch[1]}:${chapterVerseMatch[2]}`,
        );
        i++;
      }
    }

    return references;
  }

  private async generateAIResponse(
    userMessage: string,
    references: string[],
    conversation?: ChatConversation,
  ): Promise<string> {
    try {
      const history: ChatMessageType[] =
        conversation?.messages?.slice(0, -1).map((msg) => ({
          role:
            msg.sender === MessageSender.USER
              ? ChatRole.USER
              : ChatRole.ASSISTANT,
          content: msg.content,
        })) ?? [];

      const result = await this.gemini.generate(ReaFeature.CHAT, userMessage, {
        systemPrompt: `
            You are Rea, a Bible-focused Christian assistant.
            Respond thoughtfully, biblically, and conversationally.
            If scripture references are provided, respect them.
            Avoid bullet points and titles.
            Never stop mid-sentence.
            Respond in well-structured paragraphs.
          `.trim(),
        history,
        temperature: 0.7,
        maxTokens: 900,
      });

      if (!result.content || !result.content.trim()) {
        return this.getFallbackResponse(userMessage, references);
      }

      return String(result.content).trim();
    } catch {
      return this.getFallbackResponse(userMessage, references);
    }
  }

  async getConversations(userId: string) {
    return this.chatConversationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getConversationById(conversationId: string, userId: string) {
    return this.chatConversationRepository.findOne({
      where: { id: conversationId, userId },
    });
  }

  async deleteConversation(conversationId: string, userId: string) {
    const result = await this.chatConversationRepository.delete({
      id: conversationId,
      userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Conversation not found or access denied');
    }

    return { message: SYS_MSG.CONVERSATION_DELETED };
  }
}
