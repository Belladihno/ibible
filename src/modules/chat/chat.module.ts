import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { GeminiService } from './services/gemini.service';
import {
  ChatConversation,
  ChatConversationSchema,
} from '../../schemas/chat-conversation.schema';
import {
  ChatMessage,
  ChatMessageSchema,
} from '../../schemas/chat-message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatConversation.name, schema: ChatConversationSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService, GeminiService],
  exports: [ChatService, GeminiService],
})
export class ChatModule {}
