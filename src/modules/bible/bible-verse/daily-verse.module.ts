import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BibleVerseController } from './daily-verse.controller';
import { BibleVerseService } from './daily-verse.service';
import { DailyVerse } from 'src/entities/bible-verse.entity';
import { HttpModule } from '@nestjs/axios';
import { DailyVerseGeminiService } from './daily-verse-gemini.service';
import { DailyVerseConversation } from '../../../entities/daily-verse-conversation.entity';
import { DailyVerseConversationMessage } from '../../../entities/daily-verse-conversation-message.entity';
import { BibleVersion } from 'src/entities/bible-version.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DailyVerse,
      BibleVersion,
      DailyVerseConversation,
      DailyVerseConversationMessage,
    ]),
    HttpModule,
  ],
  controllers: [BibleVerseController],
  providers: [BibleVerseService, DailyVerseGeminiService],
  exports: [BibleVerseService],
})
export class BibleVerseModule {}
