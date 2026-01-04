import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatContextService } from './services/chat-context.service';
import { ChatGateway } from './chat.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { ChatConversation } from '../../entities/chat-conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { User } from '../../entities/user.entity';
import { AccessToken } from '../../entities/access-token.entity';
import { AuthGuard } from 'src/guards/auth.guard';
import appConfig from '../../config/auth.config';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatConversation,
      ChatMessage,
      User,
      AccessToken,
    ]),
    JwtModule.register({
      secret: appConfig().jwtSecret,
      signOptions: { expiresIn: '1h' },
    }),
    GeminiModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatContextService,
    ChatGateway,
    WsJwtGuard,
    AuthGuard,
  ],
  exports: [ChatService],
})
export class ChatModule {}
