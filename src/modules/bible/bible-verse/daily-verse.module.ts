import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { BibleVerseController } from './daily-verse.controller';
import { BibleVerseService } from './daily-verse.service';
import { DailyVerse } from 'src/entities/bible-verse.entity';
import { HttpModule } from '@nestjs/axios';
import { DailyVerseGeminiService } from './daily-verse-gemini.service';
import { DailyVerseConversation } from '../../../entities/daily-verse-conversation.entity';
import { DailyVerseConversationMessage } from '../../../entities/daily-verse-conversation-message.entity';
import { BibleVersion } from 'src/entities/bible-version.entity';
import { AccessToken } from 'src/entities/access-token.entity';
import { AuthGuard } from 'src/guards/auth.guard';
import appConfig from 'src/config/auth.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DailyVerse,
      BibleVersion,
      DailyVerseConversation,
      DailyVerseConversationMessage,
      AccessToken,
    ]),
    JwtModule.register({
      secret: appConfig().jwtSecret,
      signOptions: { expiresIn: '7d' },
    }),
    HttpModule,
  ],
  controllers: [BibleVerseController],
  providers: [
    BibleVerseService,
    DailyVerseGeminiService,
    DailyVerseConversation,
    AuthGuard,
  ],
  exports: [BibleVerseService, DailyVerseConversation],
})
export class BibleVerseModule {}
