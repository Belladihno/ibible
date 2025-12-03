import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ChatConversation,
  ChatConversationDocument,
} from '../../../schemas/chat-conversation.schema';
import { MessageSender } from '../../../schemas/chat-message.schema';
import {
  IMemoriesService,
  IDiscoverService,
} from '../interfaces/external-modules.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';
import { getToneInstruction } from '../constants/tone-prompts';
import { UserTone } from '../../user/enums/user.enums';

@Injectable()
export class ChatContextService {
  private readonly logger = new Logger(ChatContextService.name);

  constructor(
    @InjectModel(ChatConversation.name)
    private chatConversationModel: Model<ChatConversationDocument>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    // In the future, these would be real services injected via tokens
    // For now we can use optional or mock implementations
  ) {}

  // Mock implementations for missing services
  private memoriesService: IMemoriesService = {
    getRecentMemories: async (_userId: string, _limit: number) => [],
  };

  private discoverService: IDiscoverService = {
    getRecentEmotions: async (_userId: string, _limit: number) => [],
  };

  async buildContext(
    userId: string,
    conversationId: string,
    userMessage: string,
  ): Promise<string> {
    const [history, emotions, memories, user] = await Promise.all([
      this.getRecentHistory(conversationId),
      this.discoverService.getRecentEmotions(userId, 3),
      this.memoriesService.getRecentMemories(userId, 2),
      this.userRepository.findOne({ where: { id: userId } }),
    ]);

    const userTone = user?.aiSettings?.tone || UserTone.FRIENDLY;

    return this.formatSystemPrompt(history, emotions, memories, userTone);
  }

  private async getRecentHistory(conversationId: string): Promise<string> {
    // Optimize: Only fetch last 10 messages instead of entire conversation
    const conversation = await this.chatConversationModel
      .findById(conversationId)
      .select({ messages: { $slice: -10 } }) // Only get last 10 messages
      .lean(); // Use lean() for better performance (returns plain JS object)

    if (!conversation || !conversation.messages) return '';

    return conversation.messages
      .map(
        (msg) =>
          `${msg.sender === MessageSender.USER ? 'User' : 'Rea'}: ${msg.content}`,
      )
      .join('\n');
  }

  private formatSystemPrompt(
    history: string,
    emotions: string[],
    memories: string[],
    tone: UserTone,
  ): string {
    const toneInstruction = getToneInstruction(tone);

    return `
You are Rea, a compassionate and wise Bible companion.

Tone Preference:
${toneInstruction}

User Context:
- Recent Emotions: ${emotions.join(', ')}
- Relevant Memories: ${memories.join('; ')}

Conversation History:
${history}

Instructions:
1. Respond with empathy and biblical wisdom.
2. Address the user's current emotional state.
3. Use the context provided to personalize your response.
4. If relevant, quote scripture to encourage or guide.
5. IMPORTANT: Follow the tone preference specified above in all your responses.
`;
  }
}
