import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import {
  ChatConversation,
  ChatConversationSchema,
} from '../../schemas/chat-conversation.schema';
import { DailyVerseConversation } from '../../entities/daily-verse-conversation.entity';
import { MeditationSession } from 'src/entities/meditation-session.entity';
import { MeditationChat } from 'src/entities/meditation-chat.entity';
import { AccessToken } from 'src/entities/access-token.entity';
import { AuthGuard } from 'src/guards/auth.guard';
import appConfig from 'src/config/auth.config';

@Module({
  imports: [
    // MongoDB models
    MongooseModule.forFeature([
      { name: ChatConversation.name, schema: ChatConversationSchema },
    ]),
    // TypeORM entities
    TypeOrmModule.forFeature([DailyVerseConversation, AccessToken]),
    TypeOrmModule.forFeature([MeditationSession, MeditationChat]),
    JwtModule.register({
      secret: appConfig().jwtSecret,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [HistoryController],
  providers: [HistoryService, AuthGuard],
  exports: [HistoryService],
})
export class HistoryModule {}
