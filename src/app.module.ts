import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { EmailModule } from './modules/email';
import { SwaggerSyncModule } from 'nestjs-swagger-sync';
import { BibleModule } from './modules/bible/bible.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MemoriesModule } from './modules/memories/memories.module';
import { UserModule } from 'src/modules/user/user.module';
import { BibleVerseModule } from './modules/bible/bible-verse/daily-verse.module';
import { ChatModule } from './modules/chat/chat.module';
import {
  ChatConversation,
  ChatConversationSchema,
} from './schemas/chat-conversation.schema';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';
import { MeditationModule } from './modules/meditation/meditation.module';
import { ScheduleModule } from '@nestjs/schedule';
import dataSource from './migrations/migration.config';
import { BookmarkModule } from './modules/bookmarks/bookmark.module';
import { PrayerModule } from './modules/prayer/prayer.module';
import { DiscoverModule } from './modules/discover/discover.module';
import { StreaksModule } from './modules/streaks/streaks.module';
// import { StreaksService } from './modules/streaks/streaks.service';
import { StreaksController } from './modules/streaks/streaks.controller';
import { RedisModule } from './modules/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...dataSource.options,
        autoLoadEntities: true,
      }),
      dataSourceFactory: async () => dataSource,
    }),

    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    MongooseModule.forFeature([
      { name: ChatConversation.name, schema: ChatConversationSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),

    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    SwaggerSyncModule.register({
      apiKey: process.env.POSTMAN_API_KEY || '',
      swaggerPath: `${process.env.API_VERSION || 'api/v1'}/docs`,
      baseUrl: `http://localhost:${process.env.PORT || 3000}`,
      collectionName: 'REA Interactive Bible API',
      runTest: true,
      ignorePathWithBearerToken: ['api/v1/user/login', 'api/v1/user/signup'],
    }),
    HealthModule,
    WaitlistModule,
    EmailModule,
    UserModule,
    BibleModule,
    NotificationsModule,
    MemoriesModule,
    BibleVerseModule,
    BookmarkModule,
    ChatModule,
    ScheduleModule.forRoot(),
    MeditationModule,
    PrayerModule,
    DiscoverModule,
    StreaksModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // StreaksService,
  ],
})
export class AppModule {}
