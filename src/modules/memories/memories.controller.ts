// modules/memories/memories.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  HttpCode,
  Param,
  HttpStatus,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
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
import * as SystemMessages from 'src/shared/constants/systemMessages';

@ApiTags('Memories')
@Controller('memories')
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Post()
  @UseGuards(AuthGuard)
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
  @UseGuards(AuthGuard)
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
  @UseGuards(AuthGuard)
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
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get chronological timeline of memories' })
  async timeline(@CurrentUserId() userId: string) {
    if (!userId) {
      throw new Error('Unauthenticated');
    }
    return this.memoriesService.getTimeline(userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get specific memory' })
  async get(@Param('id') id: string, @CurrentUserId() userId?: string) {
    if (userId) {
      return this.memoriesService.findByIdWithAuth(id, userId);
    }
    return this.memoriesService.findById(id);
  }

  @Patch(':id/followup')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Memory not found',
  })
  @ApiOperation({ summary: 'Mark follow-up as completed' })
  async completeFollowUp(@Param('id') id: string) {
    const updatedMemory = await this.memoriesService.completeFollowUp(id);
    return {
      statusCode: HttpStatus.OK,
      message: SystemMessages.UPDATE_MEMORIES_BY_ID,
      data: updatedMemory,
    };
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Memory not found',
  })
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
    const updatedMemory = await this.memoriesService.update(id, servicePayload);

    return {
      statusCode: HttpStatus.OK,
      message: SystemMessages.UPDATE_MEMORIES_BY_ID,
      data: updatedMemory,
    };
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Memory not found',
  })
  @ApiOperation({ summary: 'Delete memory' })
  async remove(@Param('id') id: string) {
    const deletedMemory = await this.memoriesService.remove(id);
    return {
      statusCode: HttpStatus.OK,
      message: SystemMessages.DELETE_MEMORIES_BY_ID,
      data: deletedMemory,
    };
  }
}
