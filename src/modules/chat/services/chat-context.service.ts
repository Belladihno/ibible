import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatConversation } from '../../../entities/chat-conversation.entity';
import { ChatMessage } from '../../../entities/chat-message.entity';
import { MessageSender } from '../../../shared/enums';
import {
  IMemoriesService,
  IDiscoverService,
} from '../interfaces/external-modules.interface';
import { User } from '../../../entities/user.entity';
import { getToneInstruction } from '../constants/tone-prompts';
import { UserTone } from '../../user/enums/user.enums';

@Injectable()
export class ChatContextService {
  private readonly logger = new Logger(ChatContextService.name);

  constructor(
    @InjectRepository(ChatConversation)
    private chatConversationRepository: Repository<ChatConversation>,
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
    // Fetch last 10 messages for the conversation
    const messages = await this.chatMessageRepository.find({
      where: { conversationId },
      order: { timestamp: 'DESC' },
      take: 10,
    });

    if (!messages || messages.length === 0) return '';

    // Reverse to chronological order for the prompt
    return messages
      .reverse()
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
