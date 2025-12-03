import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UserPayload } from '../user/strategy/interface.d';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send a message to Rea (Bible AI companion)',
    description:
      'Send a message without conversationId to start a NEW chat. Include conversationId to CONTINUE an existing conversation.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Message sent and response received',
    schema: {
      example: {
        conversation: {
          _id: '507f1f77bcf86cd799439011',
          userId: 'uuid-1234',
          title: 'New Conversation',
          messages: [
            {
              sender: 'user',
              content: 'How can I deal with anxiety?',
              timestamp: '2025-11-29T16:00:00.000Z',
              references: [],
            },
            {
              sender: 'ai',
              content:
                "I understand you're dealing with anxiety. The Bible offers wonderful guidance...",
              timestamp: '2025-11-29T16:00:05.000Z',
              references: [
                {
                  book: 'Philippians',
                  chapter: 4,
                  verse: 6,
                  text: 'Do not be anxious about anything...',
                },
              ],
            },
          ],
          isActive: true,
          createdAt: '2025-11-29T16:00:00.000Z',
          updatedAt: '2025-11-29T16:00:05.000Z',
        },
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Body() createMessageDto: CreateMessageDto,
    @Req() req: Request & { user: UserPayload & { jti?: string; id?: string } },
  ) {
    // Safely extract userId from possible JWT payload keys
    type JwtPayload = {
      userId?: string;
      sub?: string;
      id?: string;
      [key: string]: unknown;
    };
    const payload = req.user as unknown as JwtPayload;
    const userId = payload.userId ?? payload.sub ?? payload.id;
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user id');
    }
    return await this.chatService.sendMessage(userId, createMessageDto);
  }

  @Get('conversations')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user's conversation history" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user conversations',
    schema: {
      example: {
        conversations: [
          {
            _id: '507f1f77bcf86cd799439011',
            userId: 'uuid-1234',
            title: 'Dealing with Anxiety',
            messages: [
              {
                sender: 'user',
                content: 'How can I deal with anxiety?',
                timestamp: '2025-11-29T16:00:00.000Z',
              },
            ],
            isActive: true,
            createdAt: '2025-11-29T16:00:00.000Z',
            updatedAt: '2025-11-29T16:00:05.000Z',
          },
          {
            _id: '507f1f77bcf86cd799439012',
            userId: 'uuid-1234',
            title: 'Prayer Guidance',
            messages: [
              {
                sender: 'user',
                content: 'How should I pray?',
                timestamp: '2025-11-28T10:00:00.000Z',
              },
            ],
            isActive: true,
            createdAt: '2025-11-28T10:00:00.000Z',
            updatedAt: '2025-11-28T10:00:10.000Z',
          },
        ],
      },
    },
  })
  async getConversations(
    @Req() req: Request & { user: UserPayload & { jti?: string; id?: string } },
  ) {
    // Safely extract userId from possible JWT payload keys
    type JwtPayload = {
      userId?: string;
      sub?: string;
      id?: string;
      [key: string]: unknown;
    };
    const payload = req.user as unknown as JwtPayload;
    const userId = payload.userId ?? payload.sub ?? payload.id;
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user id');
    }
    const conversations = await this.chatService.getConversations(userId);
    return { conversations }; // Return as an object with conversations array
  }

  @Get('conversations/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific conversation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Specific conversation details',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        userId: 'uuid-1234',
        title: 'Dealing with Anxiety',
        messages: [
          {
            sender: 'user',
            content: 'How can I deal with anxiety?',
            timestamp: '2025-11-29T16:00:00.000Z',
            references: [],
          },
          {
            sender: 'ai',
            content:
              "I understand you're dealing with anxiety. The Bible offers wonderful guidance in Philippians 4:6-7...",
            timestamp: '2025-11-29T16:00:05.000Z',
            references: [
              {
                book: 'Philippians',
                chapter: 4,
                verse: 6,
                text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.',
              },
            ],
          },
        ],
        isActive: true,
        createdAt: '2025-11-29T16:00:00.000Z',
        updatedAt: '2025-11-29T16:00:05.000Z',
      },
    },
  })
  async getConversation(
    @Param('id') id: string,
    @Req() req: Request & { user: UserPayload & { jti?: string; id?: string } },
  ) {
    // Safely extract userId from possible JWT payload keys
    type JwtPayload = {
      userId?: string;
      sub?: string;
      id?: string;
      [key: string]: unknown;
    };
    const payload = req.user as unknown as JwtPayload;
    const userId = payload.userId ?? payload.sub ?? payload.id;
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user id');
    }
    return await this.chatService.getConversationById(id, userId);
  }

  @Delete('conversations/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a specific conversation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversation deleted successfully',
    schema: {
      example: {
        message: 'Conversation deleted successfully',
      },
    },
  })
  async deleteConversation(
    @Param('id') id: string,
    @Req() req: Request & { user: UserPayload & { jti?: string; id?: string } },
  ) {
    // Safely extract userId from possible JWT payload keys
    type JwtPayload = {
      userId?: string;
      sub?: string;
      id?: string;
      [key: string]: unknown;
    };
    const payload = req.user as unknown as JwtPayload;
    const userId = payload.userId ?? payload.sub ?? payload.id;
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user id');
    }
    // TODO: Implement actual deletion logic
    return { message: 'Conversation deleted successfully' }; // Placeholder for now
  }
}
