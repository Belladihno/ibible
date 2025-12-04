import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import {
  ChatConversation,
  ChatConversationSchema,
} from '../../schemas/chat-conversation.schema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeditationSession } from 'src/entities/meditation-session.entity';
import { MeditationChat } from 'src/entities/meditation-chat.entity';

@Module({
  imports: [
    // MongoDB models
    MongooseModule.forFeature([
      { name: ChatConversation.name, schema: ChatConversationSchema },
    ]),
    TypeOrmModule.forFeature([MeditationSession, MeditationChat]),
  ],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}
