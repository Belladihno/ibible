import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MemoriesService } from './memories.service';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUserId } from '../../decorators/current-user-id.decorator';
import { CreateMemoryDto } from './dto/create-memory.dto';
import { UpdateMemoryDto } from './dto/update-memory.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody,ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Memories')
@Controller('memories')
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Post()
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new memory' })
  @ApiBody({ type: CreateMemoryDto, description: 'Create memory request body' })
  @ApiResponse({
    status: 201,
    description: 'Created memory',
    schema: {
      example: {
        id: '656f1cabc1234567890abcd',
        userId: 'user_123',
        title: 'First answered prayer',
        body: 'God answered my prayer for a job in an unexpected way.',
        tags: ['prayer', 'job'],
        verseRefs: ['John3:16'],
        visibility: 'private',
        followUp: {
          scheduledAt: '2025-12-30T00:00:00.000Z',
          reminderDeltaDays: 30,
          isCompleted: false,
        },
        aiRephrase: { text: 'God provided a job when I least expected it.' },
        createdAt: '2025-11-01T00:00:00.000Z',
        updatedAt: '2025-11-01T00:00:00.000Z',
      },
    },
  })
  create(@CurrentUserId() userId: string, @Body() payload: CreateMemoryDto) {
    if (!userId) throw new Error('Unauthenticated');
    if (payload.followUp && payload.followUp.scheduledAt) {
      payload.followUp.scheduledAt = new Date(
        payload.followUp.scheduledAt as any,
      ) as any;
    }
    return this.memoriesService.create(userId, payload as any);
  }

  @Get()
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List memories (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of memories',
    schema: {
      example: {
        results: [
          {
            id: '656f1cabc1234567890abcd',
            title: 'First answered prayer',
            body: 'God answered my prayer for a job in an unexpected way.',
            tags: ['prayer', 'job'],
            verseRefs: ['John3:16'],
            visibility: 'private',
            createdAt: '2025-11-01T00:00:00.000Z',
            updatedAt: '2025-11-01T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      },
    },
  })
  list(
    @CurrentUserId() userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.memoriesService.findAll(
      userId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }
   @Get('search')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiOperation({ summary: 'Search memories by keyword' })
@ApiResponse({
  status: 200,
  description: 'Returns the user profile',
  schema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      email: { type: 'string' },
    },
  },
})
async search(
  @CurrentUserId() userId: string,
  @Query('q') q: string,
  @Query('page') page = '1',
  @Query('limit') limit = '10',
) {
  return this.memoriesService.search(userId, q, Number(page), Number(limit));
}

  @Get(':id')
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get specific memory' })
  @ApiResponse({
    status: 200,
    description: 'Memory object',
    schema: {
      example: {
        id: '656f1cabc1234567890abcd',
        userId: 'user_123',
        title: 'First answered prayer',
        body: 'God answered my prayer for a job in an unexpected way.',
        tags: ['prayer', 'job'],
        verseRefs: ['John3:16'],
        visibility: 'private',
        followUp: {
          scheduledAt: '2025-12-30T00:00:00.000Z',
          reminderDeltaDays: 30,
          isCompleted: false,
        },
        aiRephrase: { text: 'God provided a job when I least expected it.' },
        createdAt: '2025-11-01T00:00:00.000Z',
        updatedAt: '2025-11-01T00:00:00.000Z',
      },
    },
  })
  get(@Param('id') id: string) {
    return this.memoriesService.findById(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update memory' })
  @ApiBody({
    type: UpdateMemoryDto,
    description: 'Fields to update on the memory',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated memory object',
    schema: {
      example: {
        id: '656f1cabc1234567890abcd',
        title: 'Updated title',
        body: 'Updated body',
        tags: ['prayer'],
        verseRefs: ['John3:16'],
        visibility: 'private',
        followUp: {
          scheduledAt: '2025-12-30T00:00:00.000Z',
          reminderDeltaDays: 30,
          isCompleted: false,
        },
        aiRephrase: { text: 'Updated AI rephrase' },
        createdAt: '2025-11-01T00:00:00.000Z',
        updatedAt: '2025-11-02T00:00:00.000Z',
      },
    },
  })
  update(@Param('id') id: string, @Body() payload: UpdateMemoryDto) {
    return this.memoriesService.update(id, payload as any);
  }

  @Delete(':id')
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete memory' })
  @ApiResponse({
    status: 200,
    description: 'Deleted memory (returned document)',
    schema: {
      example: {
        id: '656f1cabc1234567890abcd',
        title: 'First answered prayer',
      },
    },
  })
  remove(@Param('id') id: string) {
    return this.memoriesService.remove(id);
  }

 
}
