import {
  Controller,
  Get,
  Post,
  UseGuards,
  Patch,
  Body,
  Query,
  Request,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { MeditationService } from './meditation.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { MeditationHistoryDto } from './dto/meditation-history.dto';
import { UpdateMeditationPreferencesDto } from './dto/update-preferences.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { CompleteSessionDto } from './dto/complete-session.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { CurrentUserId } from 'src/decorators/current-user-id.decorator';

import { TrackActivity } from 'src/decorators/track-activity.decorator';

@ApiTags('Meditation')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('meditation')
export class MeditationController {
  constructor(private readonly meditationService: MeditationService) {}

  @Get('daily')
  @ApiOperation({ summary: 'Get daily meditation plan and status' })
  @ApiOkResponse({
    description: 'Daily meditation retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Request successful',
        data: {
          plan: {
            morningTime: '06:00:00',
            eveningTime: '20:00:00',
            morningEnabled: true,
            eveningEnabled: false,
            durationMinutes: 10,
          },
          verse: {
            reference: 'Psalms 62:5',
            text: 'My soul, wait in silence for God alone,\nfor my expectation is from him.',
          },
          todayCompleted: false,
          completedSessions: 0,
          streak: 0,
          timestamp: '2025-12-04T12:11:42.780Z',
        },
      },
    },
  })
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
  @TrackActivity('meditation_start', {
    body: ['meditationType', 'durationMinutes'],
  })
  @ApiOperation({
    summary: 'Start meditation session with optional initial reflection',
  })
  @ApiOkResponse({
    description: 'Daily meditation retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Request successful',
        data: {
          sessionId: 'ed981916-7c-4e20-b844-60a8ef317e3c',
          startedAt: '2025-12-04T12:20:43.091Z',
          durationMinutes: 10,
          verse: {
            reference: 'Psalms 62:5',
            text: 'My soul, wait in silence for God alone,\nfor my expectation is from him.',
          },
          initialChatMessage: "It's wonderful...",
          timestamp: '2025-12-04T12:20:47.304Z',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Session started successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async startSession(@Request() req: any, @Body() dto: StartSessionDto) {
    const userId = req.user.sub;
    return this.meditationService.startSession(userId, dto);
  }

  @Post(':sessionId/chat')
  @ApiOperation({ summary: 'Send chat message in meditation session' })
  @ApiOkResponse({
    description: 'Daily meditation retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Request successful',
        data: {
          reply: 'Oh, my dear friend, you are certainly not alone in that...',
          timestamp: '2025-12-04T12:26:47.494Z',
        },
      },
    },
  })
  async sendChatMessage(
    @CurrentUserId() userId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.meditationService.sendChatMessage(
      userId,
      sessionId,
      dto.message,
    );
  }

  @Post(':sessionId/complete')
  @TrackActivity('meditation_complete', { params: ['sessionId'] })
  @ApiOperation({ summary: 'Complete meditation session' })
  async completeSession(
    @CurrentUserId() userId: string,
    @Param('sessionId') sessionId: string,
    // @Body() dto: CompleteSessionDto,
  ) {
    return this.meditationService.completeSession(userId, {
      sessionId,
    });
  }

  @Get('history')
  @ApiOperation({ summary: 'Get meditation history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  @ApiOkResponse({
    description: 'Daily meditation retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Request successful',
        data: {
          '0': {
            id: '10b4e4-be3e-4629-845c-4fb798b492d5',
            createdAt: '2025-12-01T17:10:35.360Z',
            updatedAt: '2025-12-01T19:29:06.175Z',
            userId: '045d46-d010-478f-be7b-e3353fad40c6',
            startedAt: '2025-12-01T17:10:35.360Z',
            completedAt: '2025-12-01T18:39:18.711Z',
            durationSeconds: 5323,
            verseReference: 'Psalms 4:8',
            verseText:
              'In peace I will both lay myself down and sleep,\nfor you, Yahweh alone, make me live in safety.',
            sessionType: 'morning',
            completed: true,
            notes: {
              mood: 'calm',
              reflection: 'Felt peaceful',
            },
            initialReflection: 'This verse reminds me of my past.',
            chatCount: 17,
            chatPreview:
              'Thank you for asking me to continue. I hear your desire to find concrete ways to navigate this.\n\nWe ...',
          },
          timestamp: '2025-12-04T12:30:34.633Z',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getHistory(@Request() req: any, @Query() dto: MeditationHistoryDto) {
    const userId = req.user.sub;
    return this.meditationService.getHistory(userId, dto);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get meditation session by ID with chat history' })
  @ApiOkResponse({
    description: 'Daily meditation retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Request successful',
        data: {
          session: {
            id: 'ed981916-9f7c-4e20-b844-60a8ef317e3c',
            verseReference: 'Psalms 62:5',
            verseText:
              'My soul, wait in silence for God alone,\nfor my expectation is from him.',
            startedAt: '2025-12-04T12:20:43.091Z',
            completedAt: null,
            durationSeconds: null,
            completed: false,
            initialReflection:
              'This verse reminds me to slow down and trust God more.',
            chatCount: 5,
          },
          chatHistory: [
            {
              id: '23bbc1-9417-464c-b1b3-d82b50d10574',
              role: 'user',
              message: 'This verse reminds me to slow down and trust God more.',
              createdAt: '2025-12-04T12:20:43.123Z',
            },
            {
              id: 'ab974-dcf9-4506-8cd5-71b0bcbe292b',
              role: 'assistant',
              message: "It's wonderful how this...",
              createdAt: '2025-12-04T12:20:47.262Z',
            },
            {
              id: '48910837-f7d1-4f00-939b-6e8ab412dacc',
              role: 'user',
              message: 'I struggle with being still. My mind is always racing.',
              createdAt: '2025-12-04T12:26:41.273Z',
            },
            {
              id: '7ff38aae-3e9f-4900-86e7-eb2470e0784f',
              role: 'assistant',
              message:
                'Oh, my dear friend, you are certainly not alone in that!...',
              createdAt: '2025-12-04T12:26:47.419Z',
            },
          ],
          timestamp: '2025-12-04T12:32:30.688Z',
        },
      },
    },
  })
  async getSessionById(
    @CurrentUserId() userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.meditationService.getSessionById(userId, sessionId);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update meditation preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  @ApiOkResponse({
    description: 'Daily meditation retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Request successful',
        data: {
          id: 'a7c6cd-7d10-466b-bce3-5ba365a7addd',
          createdAt: '2025-12-01T17:08:30.391Z',
          updatedAt: '2025-12-04T15:03:22.023Z',
          userId: '044e96-d010-478f-be7b-e3353fad40c6',
          morningTime: '06:00:00',
          eveningTime: '20:00:00',
          morningEnabled: true,
          eveningEnabled: false,
          durationMinutes: 15,
          frequency: 'daily',
          customSchedule: null,
          active: true,
          timestamp: '2025-12-04T15:03:22.050Z',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async updatePreferences(
    @Request() req: any,
    @Body() dto: UpdateMeditationPreferencesDto,
  ) {
    const userId = req.user.sub;
    return this.meditationService.updatePreferences(userId, dto);
  }

  //   @Get('streak')
  //   @ApiOperation({ summary: 'Get current meditation streak' })
  //   @ApiResponse({ status: 200, description: 'Streak retrieved successfully' })
  //   @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  //   async getStreak(@Request() req: any) {
  //     const userId = req.user.sub;
  //     return this.meditationService.getStreak(userId);
  //   }

  //   @Get('stats')
  //   @ApiOperation({ summary: 'Get meditation statistics' })
  //   @ApiResponse({
  //     status: 200,
  //     description: 'Statistics retrieved successfully',
  //   })
  //   @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  //   async getStatistics(@Request() req: any) {
  //     const userId = req.user.sub;
  //     return this.meditationService.getStatistics(userId);
  //   }
}
