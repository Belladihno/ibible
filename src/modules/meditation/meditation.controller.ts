import {
  Controller,
  Get,
  Post,
  UseGuards,
  Patch,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { MeditationService } from './meditation.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { MeditationHistoryDto } from './dto/meditation-history.dto';
import { UpdateMeditationPreferencesDto } from './dto/update-preferences.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { CompleteSessionDto } from './dto/complete-session.dto';

@ApiTags('Meditation')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('meditation')
export class MeditationController {
  constructor(private readonly meditationService: MeditationService) {}

  @Get('daily')
  @ApiOperation({ summary: 'Get daily meditation plan and status' })
  @ApiResponse({
    status: 200,
    description: 'Daily meditation retrieved successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getDailyMeditation(@Request() req: any) {
    const userId = req.user.sub;
    return this.meditationService.getDailyMeditation(userId);
  }

  @Post('start')
  @ApiOperation({ summary: 'Start a new meditation session' })
  @ApiResponse({ status: 201, description: 'Session started successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async startSession(@Request() req: any, @Body() dto: StartSessionDto) {
    const userId = req.user.sub;
    return this.meditationService.startSession(userId, dto);
  }

  @Post('complete')
  @ApiOperation({ summary: 'Complete a meditation session' })
  @ApiResponse({ status: 200, description: 'Session completed successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async completeSession(@Request() req: any, @Body() dto: CompleteSessionDto) {
    const userId = req.user.sub;
    return this.meditationService.completeSession(userId, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get meditation history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getHistory(@Request() req: any, @Query() dto: MeditationHistoryDto) {
    const userId = req.user.sub;
    return this.meditationService.getHistory(userId, dto);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update meditation preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async updatePreferences(
    @Request() req: any,
    @Body() dto: UpdateMeditationPreferencesDto,
  ) {
    const userId = req.user.sub;
    return this.meditationService.updatePreferences(userId, dto);
  }

  @Get('streak')
  @ApiOperation({ summary: 'Get current meditation streak' })
  @ApiResponse({ status: 200, description: 'Streak retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getStreak(@Request() req: any) {
    const userId = req.user.sub;
    return this.meditationService.getStreak(userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get meditation statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getStatistics(@Request() req: any) {
    const userId = req.user.sub;
    return this.meditationService.getStatistics(userId);
  }
}
