import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BibleVerseController } from './daily-verse.controller';
import { BibleVerseService } from './daily-verse.service';
import { DailyVerse } from 'src/entities/bible-verse.entity';
import { HttpModule } from '@nestjs/axios';
import { DailyVerseConversation } from '../../../entities/daily-verse-conversation.entity';
import { DailyVerseConversationMessage } from '../../../entities/daily-verse-conversation-message.entity';
import { BibleVersion } from 'src/entities/bible-version.entity';
import { GeminiModule } from 'src/modules/gemini/gemini.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DailyVerse,
      BibleVersion,
      DailyVerseConversation,
      DailyVerseConversationMessage,
    ]),
    HttpModule,
    GeminiModule,
  ],
  controllers: [BibleVerseController],
  providers: [BibleVerseService, DailyVerseConversation],
  exports: [BibleVerseService, DailyVerseConversation],
})
export class BibleVerseModule {}
