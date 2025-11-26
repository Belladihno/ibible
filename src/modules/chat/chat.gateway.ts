import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message')
  async handleMessage(
    @MessageBody() createMessageDto: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(`Received message from client ${client.id}`);
      this.logger.debug(`Message data: ${JSON.stringify(createMessageDto)}`);

      // Extract userId from authenticated token (set by WsJwtGuard)
      const userId = client.data.user?.userId;

      if (!userId) {
        this.logger.error('No userId in authenticated client data');
        client.emit('error', { message: 'Authentication failed' });
        return;
      }

      this.logger.log(`Processing message for user: ${userId}`);

      // Call service to handle message
      const response = await this.chatService.sendMessage(
        userId,
        createMessageDto,
      );

      this.logger.log(`Sending response to client ${client.id}`);

      // Emit the response back
      client.emit('response', response);

      this.logger.log(`Response sent successfully to client ${client.id}`);
    } catch (error) {
      this.logger.error(
        `Error handling message: ${error.message}`,
        error.stack,
      );
      client.emit('error', {
        message: 'Failed to process message',
        error: error.message,
      });
    }
  }
}
