import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ChatConversation,
  ChatConversationDocument,
} from '../../schemas/chat-conversation.schema';
import { HistoryItem, HistoryResponse } from './dto/history-response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DailyVerseConversation } from 'src/entities/daily-verse-conversation.entity';
import { Repository } from 'typeorm';

@Injectable()
export class HistoryService {
  getMeditationHistory(mockUserId: string) {
    throw new Error('Method not implemented.');
  }
  constructor(
    @InjectModel(ChatConversation.name)
    private chatConversationModel: Model<ChatConversationDocument>,
    @InjectRepository(DailyVerseConversation)
    private dailyVerseConversationRepo: Repository<DailyVerseConversation>,
  ) {}

  async getChatHistory(userId: string): Promise<HistoryItem[]> {
    const conversations = await this.chatConversationModel
      .find({ userId })
      .sort({ updatedAt: -1 })
      .select('_id title messages createdAt updatedAt')
      .exec();

    return conversations.map((conv) => {
      const doc = conv as any; // Timestamps are added by Mongoose but not in type
      return {
        id: conv._id.toString(),
        type: 'chat' as const,
        title: conv.title || 'Untitled Conversation',
        lastActivity: doc.updatedAt || doc.createdAt || new Date(),
        preview: conv.messages?.[0]?.content || '',
        messageCount: conv.messages?.length || 0,
        createdAt: doc.createdAt || new Date(),
        metadata: {},
      };
    });
  }

  async getUnifiedHistory(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<HistoryResponse> {
    // Currently only fetching chat history as other modules are handled separately
    const chatHistory = await this.getChatHistory(userId);
    const dailyVerseHistory = await this.getDailyVerseHistory(userId);

    const allHistory = [...chatHistory, ...dailyVerseHistory];

    // Sort by most recent activity
    allHistory.sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime(),
    );

    const totalPages = Math.ceil(allHistory.length / limit);

    const validPage = Math.max(1, Math.min(page, totalPages || 1));

    // Paginate
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedHistory = allHistory.slice(start, end);

    return {
      history: paginatedHistory,
      pagination: {
        total: allHistory.length,
        page: validPage,
        limit,
      },
    };
  }

  async getDailyVerseHistory(userId: string): Promise<HistoryItem[]> {
    // Get all daily verse conversations for user
    const conversations = await this.dailyVerseConversationRepo.find({
      where: { userId },
      relations: ['messages'],
      order: { updatedAt: 'DESC' },
    });

    return conversations.map((conv) => {
      const lastMessage = conv.messages?.[conv.messages.length - 1] || null;

      const preview = lastMessage
        ? lastMessage.content.substring(0, 100)
        : `Reflection on ${conv.verseReference}`;

      return {
        id: conv.id,
        type: 'dailyVerse' as const,
        title: `Daily Verse: ${conv.verseReference}`,
        lastActivity: conv.updatedAt || conv.createdAt,
        preview,
        messageCount: conv.messages?.length ?? 0,
        createdAt: conv.createdAt,
        metadata: {
          verseReference: conv.verseReference,
          isActive: conv.isActive,
        },
      };
    });
  }

  async searchUnifiedHistory(
    userId: string,
    query: string,
    page = 1,
    limit = 20,
  ): Promise<HistoryResponse> {
    const normalizedQuery = query.toLowerCase().trim();

    const unified = await this.getUnifiedHistory(userId, 1, 10000);

    const filtered = unified.history.filter((item) => {
      const searchableText = [
        item.title,
        item.preview,
        JSON.stringify(item.metadata),
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });

    filtered.sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime(),
    );

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.max(1, Math.min(page, totalPages));

    const start = (currentPage - 1) * limit;
    const end = start + limit;

    return {
      history: filtered.slice(start, end),
      pagination: {
        total,
        page: currentPage,
        limit,
        totalPages,
      },
    };
  }
}
