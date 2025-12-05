import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { HistoryService } from './history.service';
import { UserPayload } from '../user/strategy/interface.d';

type JwtPayload = {
  userId?: string;
  sub?: string;
  id?: string;
};

@ApiTags('History')
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get unified conversation history',
    description:
      'Returns a unified history of all AI interactions across Chat, Meditation, Prayer, and Memories modules',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Unified history retrieved successfully',
    schema: {
      example: {
        history: [
          {
            id: '507f1f77bcf86cd799439011',
            type: 'chat',
            title: 'Dealing with Anxiety',
            lastActivity: '2025-12-03T16:00:00.000Z',
            preview: 'How can I deal with anxiety?',
            messageCount: 4,
            createdAt: '2025-12-03T15:00:00.000Z',
            metadata: {},
          },
          {
            id: 'uuid-meditation-123',
            type: 'meditation',
            title: 'Meditation - John 3:16',
            lastActivity: '2025-12-02T10:00:00.000Z',
            preview: "Reflecting on God's love...",
            messageCount: 6,
            createdAt: '2025-12-02T09:00:00.000Z',
            metadata: {
              verseReference: 'John 3:16',
              completed: true,
              durationSeconds: 600,
            },
          },
          {
            id: 'uuid-prayer-456',
            type: 'prayer',
            title: 'Prayer - self',
            lastActivity: '2025-12-01T14:00:00.000Z',
            preview: 'Please help me with my job interview',
            messageCount: 2,
            createdAt: '2025-12-01T14:00:00.000Z',
            metadata: {
              prayerType: 'self',
              status: 'ongoing',
              hasAIPrayer: true,
            },
          },
        ],
        pagination: {
          total: 45,
          page: 1,
          limit: 20,
        },
      },
    },
  })
  async getHistory(
    @Req() req: Request & { user: UserPayload & { jti?: string; id?: string } },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Extract userId from JWT payload
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

    const pageNum = page && page > 0 ? page : 1;
    const limitNum = limit && limit > 0 ? limit : 20;

    return await this.historyService.getUnifiedHistory(
      userId,
      pageNum,
      limitNum,
    );
  }
  @Get('search')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Search unified conversation history',
    description:
      'Search across chat, daily verse, meditation, prayer, and memory history',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search keyword',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results returned successfully',
    schema: {
      example: {
        history: [
          {
            id: '507f1f77bcf86cd799439011',
            type: 'chat',
            title: 'Finding peace in hard times',
            lastActivity: '2025-12-03T16:00:00.000Z',
            preview: 'How can I find peace when I am overwhelmed?',
            messageCount: 5,
            createdAt: '2025-12-03T15:30:00.000Z',
            metadata: {},
          },
        ],
        pagination: {
          total: 3,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      },
    },
  })
  async searchHistory(
    @Req() req: Request & { user: UserPayload & { jti?: string; id?: string } },
    @Query('q') query: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const payload = req.user as unknown as JwtPayload;
    const userId = payload.userId ?? payload.sub ?? payload.id;

    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Invalid user id');
    }

    if (!query || !query.trim()) {
      throw new BadRequestException('Search query is required');
    }

    const pageNum = page && page > 0 ? page : 1;
    const limitNum = limit && limit > 0 ? limit : 20;

    return await this.historyService.searchUnifiedHistory(
      userId,
      query.trim(),
      pageNum,
      limitNum,
    );
  }
}
