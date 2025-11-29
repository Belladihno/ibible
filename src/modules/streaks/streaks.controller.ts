import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { StreaksService } from './streaks.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { CurrentUserId } from 'src/decorators/current-user-id.decorator';

@ApiTags('Streaks')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('streak')
export class StreaksController {
  constructor(private readonly streaksService: StreaksService) {}

  @Post('ping')
  @ApiOperation({
    summary: 'Ping streak (app open)',
    description:
      'Called when the user opens the app. Logs activity type "app_open" and updates streak.',
  })
  async ping(@CurrentUserId() userId: string) {
    return this.streaksService.ping(userId);
  }

  @Post('activity')
  @ApiOperation({
    summary: 'Log an activity',
    description:
      'Logs any activity performed by the user (reading, prayer, study, etc). Also updates streak.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Activity type (e.g., reading, prayer, app_open)',
    example: 'reading',
  })
  async logActivity(
    @CurrentUserId() userId: string,
    @Query('type') type: string = 'general',
  ) {
    return this.streaksService.logActivity(userId, type);
  }

  @Get()
  @ApiOperation({
    summary: 'Get current streak',
    description:
      'Returns the user’s streak data including current streak, longest streak, last active date, and total activity days.',
  })
  async getStreak(@CurrentUserId() userId: string) {
    return this.streaksService.getStreak(userId);
  }
  @Get('history')
  @ApiOperation({
    summary: 'Get streak calendar history',
    description: 'Returns an array showing your activity for the past X days. ',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to include in history (default 30).',
    example: 30,
  })
  async getHistory(
    @CurrentUserId() userId: string,
    @Query('days') days: number = 30,
  ) {
    return this.streaksService.getHistory(userId, days);
  }

  @Get('activities')
  @ApiOperation({
    summary: 'Get recent streak activities',
    description:
      'Returns the most recent activity logs (activity type, date, timestamp).',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of activities to return (default 50)',
    example: 50,
  })
  async getActivities(
    @CurrentUserId() userId: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.streaksService.getActivities(userId, limit);
  }
}
