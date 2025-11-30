import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import appConfig from '../../config/auth.config';
import { MongooseModule } from '@nestjs/mongoose';
import { Memory, MemorySchema } from './schemas/memory.schema';
import { MemoriesService } from './memories.service';
import { MemoriesController } from './memories.controller';
import { NotificationsAdapter } from './notifications.adapter';
import { MemoriesScheduler } from './memories.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';
import { BibleModule } from '../bible/bible.module';
import { ChatModule } from '../chat/chat.module';
import { AiMemoryService } from './ai-memory.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Memory.name, schema: MemorySchema }]),
    JwtModule.register({
      secret: appConfig().jwtSecret,
      signOptions: { expiresIn: '1h' },
    }),
    NotificationsModule,
    BibleModule,
    ChatModule,
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
