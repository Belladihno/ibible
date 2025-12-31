import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import {
  ChatConversation,
  ChatConversationDocument,
} from '../../schemas/chat-conversation.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageSender } from '../../schemas/chat-message.schema';
import { ChatContextService } from './services/chat-context.service';
import Redis from 'ioredis';
import { GeminiService } from '../gemini/gemini.service';
import { ChatRole, ReaFeature } from 'src/shared/enums';
import { ChatMessage } from 'src/shared/types/chat.types';
import * as SYS_MSG from '../../shared/constants/systemMessages';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(ChatConversation.name)
    private chatConversationModel: Model<ChatConversationDocument>,
    private gemini: GeminiService,
    private chatContextService: ChatContextService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async createConversation(
    userId: string,
    firstMessage?: string,
  ): Promise<ChatConversationDocument> {
    let title = 'New Conversation';

    if (firstMessage) {
      try {
        // WAIT for AI title (fast, should be < 2 seconds)
        title = await this.getAITitleWithTimeout(firstMessage, userId);
        this.logger.log(`AI title created: "${title}"`);
      } catch (error) {
        this.logger.warn(`AI title failed, using simple: ${error.message}`);
        title = this.getSimpleTitle(firstMessage);
      }
    }

    // Make unique if needed
    const uniqueTitle = await this.makeTitleUnique(userId, title);

    const conversation = new this.chatConversationModel({
      userId,
      title: uniqueTitle,
      messages: [],
      isActive: true,
    });

    return await conversation.save();
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
    const titlePromise = this.gemini.generate(ReaFeature.TITLE, userMessage, {
      systemPrompt: prompt,
      temperature: 0.4,
      maxTokens: 20,
    });

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
    let conversation: ChatConversationDocument;

    if (createMessageDto.conversationId) {
      const existing = await this.chatConversationModel.findOne({
        _id: createMessageDto.conversationId,
        userId,
        isActive: true,
      });

      if (!existing) throw new NotFoundException('Conversation not found');
      conversation = existing;
    } else {
      conversation = await this.createConversation(
        userId,
        createMessageDto.content,
      );
    }

    // -------------------- ADD USER MESSAGE --------------------
    conversation.messages.push({
      sender: MessageSender.USER,
      content: createMessageDto.content,
      timestamp: new Date(),
      references: [],
    });

    const scriptureReferences = this.extractScriptureReferences(
      createMessageDto.content,
    );
    await conversation.save();

    // -------------------- BUILD SYSTEM PROMPT --------------------
    const systemPrompt = await this.chatContextService.buildContext(
      userId,
      conversation.id as string,
      createMessageDto.content,
    );

    // -------------------- GENERATE AI RESPONSE --------------------
    let aiResponseContent: string;

    try {
      aiResponseContent = await this.gemini.generate(
        ReaFeature.CHAT,
        createMessageDto.content,
        {
          systemPrompt,
          temperature: 0.7,
          maxTokens: 1200, // increased to reduce cut-off
          userId: userId,
        },
      );
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
    conversation.messages.push({
      sender: MessageSender.AI,
      content: aiResponseContent,
      timestamp: new Date(),
      references: [
        ...new Set([...scriptureReferences, ...aiResponseReferences]),
      ],
    });

    await conversation.save();

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
      const existing = await this.chatConversationModel.findOne({
        userId,
        title: baseTitle,
      });

      if (!existing) return baseTitle;

      // Find numbered versions
      const escapedTitle = baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = `^${escapedTitle}\\s*\\(\\d+\\)$`;

      const similarTitles = await this.chatConversationModel.find({
        userId,
        title: { $regex: pattern, $options: 'i' },
      });

      // Find highest number
      let maxNum = 1;
      const numPattern = /\((\d+)\)$/;

      similarTitles.forEach((doc) => {
        const match = doc.title.match(numPattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
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
    // Create case-insensitive regex for partial matching
    const searchRegex = new RegExp(searchQuery, 'i');

    // Build the query
    const query = {
      userId,
      title: { $regex: searchRegex },
      isActive: true,
    };

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute search with pagination
    const [conversations, total] = await Promise.all([
      this.chatConversationModel
        .find(query)
        .sort({ updatedAt: -1 }) // Most recently updated first
        .skip(skip)
        .limit(limit)
        .lean(),
      this.chatConversationModel.countDocuments(query),
    ]);

    // Transform MongoDB documents
    const transformedConversations = conversations.map((conversation) => {
      const { _id, ...rest } = conversation;
      return { id: _id.toString(), ...rest };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      conversations: transformedConversations,
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
        resultsCount: transformedConversations.length,
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

    // Validate limit to prevent abuse
    const validatedLimit = Math.min(limit, 100); // Max 100 items per page
    const validatedPage = Math.max(page, 1);

    // Build dynamic query
    const query: FilterQuery<ChatConversationDocument> = {
      userId,
      isActive: true,
    };

    // Title search (partial match, case-insensitive)
    if (criteria.title && criteria.title.trim().length > 0) {
      const searchTerm = criteria.title.trim();
      query.title = { $regex: new RegExp(searchTerm, 'i') };
      this.logger.debug(`Title search regex: ${query.title.$regex}`);
    }

    // Date range filter
    if (criteria.startDate || criteria.endDate) {
      query.createdAt = {};
      if (criteria.startDate) {
        query.createdAt.$gte = criteria.startDate;
        this.logger.debug(
          `Start date filter: ${criteria.startDate.toISOString()}`,
        );
      }
      if (criteria.endDate) {
        // Add end of day for inclusive filtering
        const endOfDay = new Date(criteria.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endOfDay;
        this.logger.debug(`End date filter: ${endOfDay.toISOString()}`);
      }
    }

    // Has scripture references filter - FIXED
    if (criteria.hasReferences !== undefined) {
      if (criteria.hasReferences) {
        // Conversations that have at least one message with references
        query['messages'] = {
          $elemMatch: {
            references: { $exists: true, $ne: [], $not: { $size: 0 } },
          },
        };
        this.logger.debug(
          'Filter: Has scripture references (using $elemMatch)',
        );
      } else {
        // Conversations with no references in any message
        query['messages.references'] = { $exists: false };
        this.logger.debug('Filter: No scripture references');
      }
    }

    this.logger.debug(`Final MongoDB query: ${JSON.stringify(query, null, 2)}`);

    // Calculate pagination
    const skip = (validatedPage - 1) * validatedLimit;

    try {
      // Execute search with performance timing
      const startTime = Date.now();

      const [conversations, total] = await Promise.all([
        this.chatConversationModel
          .find(query)
          .select('-__v') // Exclude version key
          .sort({ updatedAt: -1 }) // Most recently updated first
          .skip(skip)
          .limit(validatedLimit)
          .lean()
          .exec(),
        this.chatConversationModel.countDocuments(query).exec(),
      ]);

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Search executed in ${executionTime}ms, found ${conversations.length} of ${total} total conversations`,
      );

      // Transform results
      const transformedConversations = conversations.map((conversation) => {
        const { _id, __v, ...rest } = conversation;
        return {
          id: _id.toString(),
          ...rest,
        };
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / validatedLimit);

      const result = {
        conversations: transformedConversations,
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

      this.logger.debug(
        `Pagination info: ${JSON.stringify(result.pagination)}`,
      );

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
    conversation?: ChatConversationDocument,
  ): Promise<string> {
    try {
      const history: ChatMessage[] =
        conversation?.messages?.slice(0, -1).map((msg) => ({
          role:
            msg.sender === MessageSender.USER
              ? ChatRole.USER
              : ChatRole.ASSISTANT,
          content: msg.content,
        })) ?? [];

      const response = await this.gemini.generate(
        ReaFeature.CHAT,
        userMessage,
        {
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
        },
      );

      if (!response || !response.trim()) {
        return this.getFallbackResponse(userMessage, references);
      }

      return response.trim();
    } catch {
      return this.getFallbackResponse(userMessage, references);
    }
  }

  async getConversations(userId: string) {
    const conversations = await this.chatConversationModel
      .find({ userId })
      .sort({ createdAt: -1 });

    return conversations.map((conversation) => {
      const { _id, ...rest } = conversation.toObject();
      return { id: _id.toString(), ...rest };
    });
  }

  async getConversationById(conversationId: string, userId: string) {
    const conversation = await this.chatConversationModel.findOne({
      _id: conversationId,
      userId,
    });

    if (!conversation) {
      return null;
    }

    const { _id, ...rest } = conversation.toObject();
    return { id: _id.toString(), ...rest };
  }

  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await this.chatConversationModel.findOne({
      _id: conversationId,
      userId,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found or access denied');
    }

    await this.chatConversationModel.deleteOne({
      _id: conversationId,
      userId,
    });

    return { message: SYS_MSG.CONVERSATION_DELETED };
  }
}
