import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ChatConversation,
  ChatConversationDocument,
} from '../../schemas/chat-conversation.schema';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeditationChat } from 'src/entities/meditation-chat.entity';
import { MeditationSession } from 'src/entities/meditation-session.entity';
import { HistoryItem, HistoryResponse } from './dto/history-response.dto';


@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(ChatConversation.name)
    private chatConversationModel: Model<ChatConversationDocument>,
     @InjectRepository(MeditationSession)
    private meditationSessionRepo: Repository<MeditationSession>,
    @InjectRepository(MeditationChat)
    private meditationChatRepo: Repository<MeditationChat>,
  ) {}

  async getChatHistory(userId: string): Promise<HistoryItem[]> {
    const conversations = await this.chatConversationModel
      .find({ userId })
      .sort({ updatedAt: -1 })
      .select('_id title messages createdAt updatedAt')
      .exec();

    return conversations.map((conv) => {
      const doc = conv as any;
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

  async getMeditationHistory(userId: string): Promise<HistoryItem[]> {
    // Get all meditation sessions for user (completed only or all with chat)
    const sessions = await this.meditationSessionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const sessionsWithChat = sessions.filter(s => s.chatCount > 0);

    // Get chat history for each session
    const historyItems = await Promise.all(
      sessionsWithChat.map(async (session) => {
        const lastChat = await this.meditationChatRepo.findOne({
          where: { sessionId: session.id },
          order: { createdAt: 'DESC' },
        });

        const title = `Meditation: ${session.verseReference || 'Reflection'}`;

        let preview = '';
        if (lastChat) {
          preview = lastChat.message.substring(0, 100);
        } else if (session.initialReflection) {
          preview = session.initialReflection.substring(0, 100);
        }

        return {
          id: session.id,
          type: 'meditation' as const,
          title,
          lastActivity: session.updatedAt || session.createdAt,
          preview,
          messageCount: session.chatCount,
          createdAt: session.createdAt,
          metadata: {
            verseReference: session.verseReference,
            verseText: session.verseText,
            completed: session.completed,
            durationSeconds: session.durationSeconds,
            sessionType: session.sessionType,
            chatCount: session.chatCount,
            initialReflection: session.initialReflection,
          },
        };
      }),
    );

    return historyItems;
  }

  async getUnifiedHistory(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<HistoryResponse> {
    // Fetch all history types
    const [chatHistory, meditationHistory] = await Promise.all([
      this.getChatHistory(userId),
      this.getMeditationHistory(userId),
    ]);

    // Combine all history
    const allHistory = [
      ...chatHistory,
      ...meditationHistory,
    ];

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
        totalPages: Math.ceil(allHistory.length / limit),
      },
    };
  }
}