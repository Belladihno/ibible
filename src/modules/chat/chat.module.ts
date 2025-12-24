import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { GeminiService } from './services/gemini.service';
import { ChatContextService } from './services/chat-context.service';
import { ChatGateway } from './chat.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import {
  ChatConversation,
  ChatConversationSchema,
} from '../../schemas/chat-conversation.schema';
import {
  ChatMessage,
  ChatMessageSchema,
} from '../../schemas/chat-message.schema';
import { User } from '../../entities/user.entity';
import { AccessToken } from '../../entities/access-token.entity';
import { AuthGuard } from 'src/guards/auth.guard';
import Redis from 'ioredis';
import appConfig from '../../config/auth.config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatConversation.name, schema: ChatConversationSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
    TypeOrmModule.forFeature([User, AccessToken]),
    JwtModule.register({
      secret: appConfig().jwtSecret,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    GeminiService,
    ChatContextService,
    ChatGateway,
    WsJwtGuard,
    AuthGuard,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get('REDIS_HOST') || 'localhost',
          port: configService.get('REDIS_PORT') || 6379,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [ChatService, GeminiService],
})
export class ChatModule {}
