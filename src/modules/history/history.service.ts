import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatConversation } from '../../entities/chat-conversation.entity';
import { HistoryItem, HistoryResponse } from './dto/history-response.dto';
import { DailyVerseConversation } from 'src/entities/daily-verse-conversation.entity';

@Injectable()
export class HistoryService {
  getMeditationHistory(mockUserId: string) {
    throw new Error('Method not implemented.');
  }
  constructor(
    @InjectRepository(ChatConversation)
    private chatConversationRepository: Repository<ChatConversation>,
    @InjectRepository(DailyVerseConversation)
    private dailyVerseConversationRepo: Repository<DailyVerseConversation>,
  ) {}

  async getChatHistory(userId: string): Promise<HistoryItem[]> {
    const conversations = await this.chatConversationRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      relations: ['messages'],
    });

    return conversations.map((conv) => {
      // Sort messages by timestamp descending to get the latest
      const messages = conv.messages || [];
      const sortedMessages = messages.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );

      const lastMessage = sortedMessages[0];

      return {
        id: conv.id,
        type: 'chat' as const,
        title: conv.title || 'Untitled Conversation',
        lastActivity: conv.updatedAt || conv.createdAt || new Date(),
        preview: lastMessage?.content || '',
        messageCount: messages.length,
        createdAt: conv.createdAt || new Date(),
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
