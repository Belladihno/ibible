// modules/memories/memories.controller.ts
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
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MemoriesService } from './memories.service';
import { CurrentUserId } from '../../decorators/current-user-id.decorator';
import { CreateMemoryDto } from './dto/create-memory.dto';
import { UpdateMemoryDto } from './dto/update-memory.dto';

@ApiTags('Memories')
@Controller('memories')
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new memory' })
  @ApiBody({ type: CreateMemoryDto })
  @ApiResponse({
    status: 201,
    description: 'Created memory',
  })
  async create(
    @CurrentUserId() userId: string,
    @Body() payload: CreateMemoryDto,
  ) {
    if (!userId) {
      throw new Error('Unauthenticated');
    }

    // Convert DTO to service payload with proper Date objects
    const servicePayload = {
      ...payload,
      followUp: payload.followUp
        ? {
            ...payload.followUp,
            scheduledAt: payload.followUp.scheduledAt
              ? new Date(payload.followUp.scheduledAt)
              : undefined,
          }
        : undefined,
    };

    return this.memoriesService.create(userId, servicePayload);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List memories (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of memories',
  })
  async list(
    @CurrentUserId() userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.memoriesService.findAll(userId, page, limit);
  }

  @Get('search')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search memories by keyword' })
  async search(
    @CurrentUserId() userId: string,
    @Query('q') q: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.memoriesService.search(userId, q, page, limit);
  }

  @Get('timeline')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get chronological timeline of memories' })
  async timeline(@CurrentUserId() userId: string) {
    if (!userId) {
      throw new Error('Unauthenticated');
    }
    return this.memoriesService.getTimeline(userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get specific memory' })
  async get(@Param('id') id: string, @CurrentUserId() userId?: string) {
    if (userId) {
      return this.memoriesService.findByIdWithAuth(id, userId);
    }
    return this.memoriesService.findById(id);
  }

  @Post(':id/followup')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark follow-up as completed' })
  async completeFollowUp(@Param('id') id: string) {
    return this.memoriesService.completeFollowUp(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update memory' })
  @ApiBody({ type: UpdateMemoryDto })
  async update(@Param('id') id: string, @Body() payload: UpdateMemoryDto) {
    // Convert DTO to service payload with proper Date objects
    const servicePayload = {
      ...payload,
      followUp: payload.followUp
        ? {
            ...payload.followUp,
            scheduledAt: payload.followUp.scheduledAt
              ? new Date(payload.followUp.scheduledAt)
              : undefined,
          }
        : undefined,
    };

    return this.memoriesService.update(id, servicePayload);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete memory' })
  async remove(@Param('id') id: string) {
    return this.memoriesService.remove(id);
  }
}
