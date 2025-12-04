import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ChatConversation,
  ChatConversationDocument,
} from '../../schemas/chat-conversation.schema';
import { HistoryItem, HistoryResponse } from './dto/history-response.dto';

@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(ChatConversation.name)
    private chatConversationModel: Model<ChatConversationDocument>,
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

    const allHistory = [...chatHistory];

    // Sort by most recent activity
    allHistory.sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime(),
    );

    // Paginate
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedHistory = allHistory.slice(start, end);

    return {
      history: paginatedHistory,
      pagination: {
        total: allHistory.length,
        page,
        limit,
      },
    };
  }
}
