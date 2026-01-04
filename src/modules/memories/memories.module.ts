import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Memory } from '../../entities/memory.entity';
import { MemoriesService } from './memories.service';
import { MemoriesController } from './memories.controller';
import { NotificationsAdapter } from './notifications.adapter';
import { MemoriesScheduler } from './schedulers/memory.scheduler';
import { AiMemoryService } from './ai-memory.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { BibleModule } from '../bible/bible.module';
import { ChatModule } from '../chat/chat.module';
import { RedisModule } from '../redis/redis.module';
import { QueueModule } from '../queue/queue.module';
import { GeminiModule } from '../gemini/gemini.module';
import { AccessToken } from 'src/entities/access-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Memory, AccessToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'default-secret'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    NotificationsModule,
    BibleModule,
    GeminiModule,
    RedisModule,
    QueueModule,
  ],
  controllers: [MemoriesController],
  providers: [
    MemoriesService,
    NotificationsAdapter,
    MemoriesScheduler,
    AiMemoryService,
  ],
  exports: [MemoriesService],
})
export class MemoriesModule {}
