import {
  Controller,
  HttpStatus,
  Post,
  UseGuards,
  Body,
  Request,
  Get,
} from '@nestjs/common';
import { TrackActivity } from 'src/decorators/track-activity.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { DiscoverService } from './discover.service';
import { LogEmotionDto } from './dto/log-emotion.dto';
import { OptionalAuthGuard } from 'src/guards/optional-auth.guard';
import { AuthGuard } from 'src/guards/auth.guard';
import * as SYM from 'src/shared/constants/systemMessages';
import { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';

@ApiTags('Discover')
@Controller('discover')
export class DiscoverController {
  constructor(private readonly discoverService: DiscoverService) {}

  @Post('/emotion')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary:
      'Log a user emotion and return Bible verses related to that emotion',
  })
  @ApiBody({ type: LogEmotionDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: SYM.EMOTION_LOGGED_AND_VERSES_RETURNED,
    schema: {
      example: {
        statusCode: HttpStatus.CREATED,
        message: SYM.EMOTION_LOGGED_AND_VERSES_RETURNED,
        data: {
          emotion: 'sad',
          verses: ['Psalm 34:18', 'Matthew 5:4', 'Isaiah 41:10'],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SYM.INVALID_PAYLOAD,
    schema: {
      example: {
        statusCode: HttpStatus.BAD_REQUEST,
        message: SYM.EMOTION_REQUIRED,
      },
    },
  })
  @TrackActivity('discover_emotion', { body: ['emotion'] })
  async createEmotion(
    @Body() logEmotionDto: LogEmotionDto,
    @Request() req: { user?: JwtPayload & { userId?: string; id?: string } },
  ) {
    // Safely extract optional userId from possible JWT payload keys
    const userId = req?.user
      ? (req.user.userId ?? req.user.sub ?? req.user.id)
      : undefined;

    const verses = await this.discoverService.createEmotion(
      logEmotionDto,
      userId,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: SYM.EMOTION_LOGGED_AND_VERSES_RETURNED,
      data: {
        emotion: logEmotionDto.emotion,
        verses,
      },
    };
  }

  @Get('emotions/history')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve all logged emotions for a user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of emotions previously logged by the user.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'emotion-id-123' },
          emotion: { type: 'string', example: 'sad' },
          loggedAt: { type: 'string', example: '2025-01-10T12:45:00.000Z' },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SYM.USER_NOT_FOUND,
    schema: {
      example: {
        statusCode: 400,
        message: SYM.USER_NOT_FOUND,
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized — token missing or invalid.',
    schema: {
      example: {
        statusCode: 401,
        message: SYM.UNAUTHENTICATED_MESSAGE,
      },
    },
  })
  async getHistory(
    @Request() req: { user: JwtPayload & { userId?: string; id?: string } },
  ) {
    // Safely extract userId
    const userId = req.user.userId ?? req.user.sub ?? req.user.id;

    if (!userId) {
      throw new Error('Invalid user id');
    }

    const history = await this.discoverService.getEmotionHistory(userId);

    return {
      statusCode: HttpStatus.OK,
      message: SYM.HISTORY_FETCHED,
      data: history,
    };
  }
}
