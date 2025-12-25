import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { TrackActivity } from 'src/decorators/track-activity.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import type { Request } from 'express';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import {
  SearchConversationsDto,
  AdvancedSearchConversationsDto,
} from './dto/search-conversations.dto';
import { UserPayload } from '../user/strategy/interface.d';
import { BadRequestException } from '@nestjs/common';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  @UseGuards(AuthGuard)
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
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversation not found when using conversationId',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description:
      'Rate limit exceeded (3 AI requests per minute or 15 per day across all AI features)',
  })
  @HttpCode(HttpStatus.CREATED)
  @TrackActivity('chat_message_sent', {
    body: ['content'],
    response: ['conversation._id'],
  })
  async sendMessage(
    @Body() createMessageDto: CreateMessageDto,
    @Req() req: Request & { user: UserPayload & { jti?: string; id?: string } },
  ) {
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
  @UseGuards(AuthGuard)
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
        ],
      },
    },
  })
  async getConversations(
    @Req() req: Request & { user: UserPayload & { jti?: string; id?: string } },
  ) {
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
    return { conversations };
  }

  @Get('conversations/search')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Search conversations by title',
    description: `Search for conversations using keywords in the title. Returns paginated results with AI-generated titles.
    
**Examples:**
- Search for "faith" → finds "Faith Journey", "Living by Faith", "Understanding Faith"
- Search for "prayer" → finds "Prayer Discussion", "How to Pray", "Power of Prayer"

**Features:**
- Partial matching (searches within titles)
- Case-insensitive
- Paginated results
- Results sorted by most recent activity`,
  })
  @ApiQuery({
    name: 'query',
    required: false,
    description: 'Search keywords for conversation titles',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of results per page',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results returned successfully',
    schema: {
      example: {
        conversations: [
          {
            id: '507f1f77bcf86cd799439011',
            userId: 'uuid-1234',
            title: 'Faith Journey',
            messages: [
              {
                sender: 'user',
                content: 'How do I grow in faith?',
                timestamp: '2025-11-29T16:00:00.000Z',
              },
            ],
            isActive: true,
            createdAt: '2025-11-29T16:00:00.000Z',
            updatedAt: '2025-11-29T16:00:05.000Z',
          },
          {
            id: '507f1f77bcf86cd799439022',
            userId: 'uuid-1234',
            title: 'Living by Faith',
            messages: [
              {
                sender: 'user',
                content: 'What does it mean to live by faith?',
                timestamp: '2025-11-28T10:00:00.000Z',
              },
            ],
            isActive: true,
            createdAt: '2025-11-28T10:00:00.000Z',
            updatedAt: '2025-11-28T10:00:10.000Z',
          },
        ],
        pagination: {
          total: 5,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
          nextPage: null,
          prevPage: null,
        },
        searchInfo: {
          query: 'faith',
          resultsCount: 2,
        },
      },
    },
  })
  async searchConversations(
    @Req() req: Request & { user: UserPayload & { jti?: string; id?: string } },
    @Query() searchDto: SearchConversationsDto,
  ) {
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

    const results = await this.chatService.searchConversationsByTitle(
      userId,
      searchDto.query || '',
      searchDto.page,
      searchDto.limit,
    );

    return results;
  }

  @Post('conversations/advanced-search')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Advanced conversation search with multiple filters',
    description: `Search conversations with multiple criteria including title, date range, and scripture references.

**Filters Available:**
1. **Title Search**: Partial keyword matching in titles
2. **Date Range**: Filter conversations created within specific dates
3. **Scripture References**: Find conversations that contain or don't contain Bible verses

**Examples:**
- Find all "prayer" conversations from last month
- Find conversations with scripture references about "love"
- Find recent discussions about "anxiety"`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Advanced search results returned successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Request successful',
        data: {
          conversations: [
            {
              id: '507f1f77bcf86cd799439011',
              userId: 'uuid-1234',
              title: 'Prayer and Anxiety',
              messages: [
                {
                  sender: 'user',
                  content: 'How do I pray when anxious?',
                  timestamp: '2025-11-29T16:00:00.000Z',
                  references: ['Philippians 4:6-7'],
                },
              ],
              isActive: true,
              createdAt: '2025-11-29T16:00:00.000Z',
              updatedAt: '2025-11-29T16:00:05.000Z',
            },
          ],
          pagination: {
            total: 3,
            page: 1,
            limit: 20,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
            nextPage: null,
            prevPage: null,
          },
          searchInfo: {
            query: 'anxiety',
            resultsCount: 1,
          },
          timestamp: '2025-12-05T10:00:00.000Z',
        },
      },
    },
  })
  async advancedSearchConversations(
    @Req() req: Request & { user: UserPayload & { jti?: string; id?: string } },
    @Body() searchDto: AdvancedSearchConversationsDto,
  ) {
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

    // Validate at least one search criteria is provided
    if (
      !searchDto.query &&
      !searchDto.startDate &&
      !searchDto.endDate &&
      searchDto.hasReferences === undefined
    ) {
      throw new BadRequestException(
        'At least one search criteria must be provided (query, date range, or hasReferences)',
      );
    }

    // Convert date strings to Date objects if provided
    const criteria = {
      title: searchDto.query,
      startDate: searchDto.startDate
        ? new Date(searchDto.startDate)
        : undefined,
      endDate: searchDto.endDate ? new Date(searchDto.endDate) : undefined,
      hasReferences: searchDto.hasReferences,
    };

    // Validate date range if both dates provided
    if (
      criteria.startDate &&
      criteria.endDate &&
      criteria.startDate > criteria.endDate
    ) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const results = await this.chatService.searchConversations(
      userId,
      criteria,
      searchDto.page || 1,
      searchDto.limit || 20,
    );

    return {
      statusCode: 200,
      message: 'Request successful',
      data: {
        conversations: results.conversations,
        pagination: results.pagination,
        searchInfo: {
          query: searchDto.query || '',
          resultsCount: results.conversations.length,
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('conversations/:id')
  @UseGuards(AuthGuard)
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
  })
  async getConversation(
    @Param('id') id: string,
    @Req() req: Request & { user: UserPayload & { jti?: string; id?: string } },
  ) {
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
  @UseGuards(AuthGuard)
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
  })
  async deleteConversation(
    @Param('id') id: string,
    @Req() req: Request & { user: UserPayload & { jti?: string; id?: string } },
  ) {
    // TODO: Implement actual deletion logic
    return { message: 'Conversation deleted successfully' };
  }
}
