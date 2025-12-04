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
    description: `Send a message to chat with Rea, your Bible AI companion.
    
**Creating a NEW conversation:** 
- Omit \`conversationId\` field to start a new chat
- The conversation title will be automatically generated from your first message
- Example: "What does John 3:16 mean?" → Title: "Understanding John 3:16"

**Continuing EXISTING conversation:**
- Include \`conversationId\` to continue an existing chat
- The title remains unchanged`,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Message sent and response received',
    schema: {
      example: {
        conversation: {
          _id: '507f1f77bcf86cd799439011',
          userId: 'uuid-1234',
          title: 'Understanding Revelation 14:7', // AI-generated title
          messages: [
            {
              sender: 'user',
              content: 'Hello, can you help me understand Revelation 14:7?',
              timestamp: '2025-11-29T16:00:00.000Z',
              references: [],
            },
            {
              sender: 'ai',
              content:
                "Certainly! Revelation 14:7 says: 'Fear God and give him glory, because the hour of his judgment has come. Worship him who made the heavens, the earth, the sea and the springs of water.' This verse is part of the messages proclaimed by three angels...",
              timestamp: '2025-11-29T16:00:05.000Z',
              references: [
                {
                  book: 'Revelation',
                  chapter: 14,
                  verse: 7,
                  text: 'He said in a loud voice, "Fear God and give him glory, because the hour of his judgment has come. Worship him who made the heavens, the earth, the sea and the springs of water."',
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
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data',
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversation not found when using conversationId',
    schema: {
      example: {
        statusCode: 404,
        message: 'Conversation not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (20 messages per minute)',
    schema: {
      example: {
        statusCode: 429,
        message: 'Rate limit exceeded. Please try again later.',
        error: 'Too Many Requests',
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
    const conversation = await this.chatService.sendMessage(
      userId,
      createMessageDto,
    );
    return { conversation };
  }

  @Get('conversations')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get user's conversation history",
    description:
      'Returns all conversations with AI-generated meaningful titles',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user conversations with AI-generated titles',
    schema: {
      example: {
        conversations: [
          {
            _id: '507f1f77bcf86cd799439011',
            userId: 'uuid-1234',
            title: 'Understanding Revelation 14:7', // AI-generated
            messages: [
              {
                sender: 'user',
                content: 'Hello, can you help me understand Revelation 14:7?',
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
            title: 'Biblical Perspective on Anxiety', // AI-generated
            messages: [
              {
                sender: 'user',
                content: 'How can I deal with anxiety as a Christian?',
                timestamp: '2025-11-28T10:00:00.000Z',
              },
            ],
            isActive: true,
            createdAt: '2025-11-28T10:00:00.000Z',
            updatedAt: '2025-11-28T10:00:10.000Z',
          },
          {
            _id: '507f1f77bcf86cd799439013',
            userId: 'uuid-1234',
            title: 'The Prodigal Son Explained', // AI-generated
            messages: [
              {
                sender: 'user',
                content: 'Can you explain the parable of the prodigal son?',
                timestamp: '2025-11-27T14:00:00.000Z',
              },
            ],
            isActive: true,
            createdAt: '2025-11-27T14:00:00.000Z',
            updatedAt: '2025-11-27T14:00:15.000Z',
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
        title: 'Understanding Revelation 14:7', // AI-generated
        messages: [
          {
            sender: 'user',
            content: 'Hello, can you help me understand Revelation 14:7?',
            timestamp: '2025-11-29T16:00:00.000Z',
            references: [],
          },
          {
            sender: 'ai',
            content:
              "Certainly! Revelation 14:7 says: 'Fear God and give him glory, because the hour of his judgment has come. Worship him who made the heavens, the earth, the sea and the springs of water.' This verse is part of the messages proclaimed by three angels...",
            timestamp: '2025-11-29T16:00:05.000Z',
            references: [
              {
                book: 'Revelation',
                chapter: 14,
                verse: 7,
                text: 'He said in a loud voice, "Fear God and give him glory, because the hour of his judgment has come. Worship him who made the heavens, the earth, the sea and the springs of water."',
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
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversation not found or access denied',
    schema: {
      example: {
        statusCode: 404,
        message: 'Conversation not found',
        error: 'Not Found',
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
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversation not found or access denied',
    schema: {
      example: {
        statusCode: 404,
        message: 'Conversation not found',
        error: 'Not Found',
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
