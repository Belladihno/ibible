import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  ParseUUIDPipe,
  HttpStatus,
  UseGuards,
  Req,
  Get,
} from '@nestjs/common';
import { TrackActivity } from 'src/decorators/track-activity.decorator';
import { CreatePrayerDto } from './dto/create-prayer.dto';
import { UpdatePrayerDto } from './dto/update-prayer.dto';
import { PrayerService } from './prayer.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserPayload } from '../user/strategy/interface.d';
import { Prayer } from 'src/entities/prayer.entity';

@Controller('prayers')
export class PrayerController {
  constructor(private readonly prayerService: PrayerService) {}

  private extractUserId(
    req: Request & {
      user: UserPayload & {
        userId?: string;
        sub?: string;
        id?: string;
      };
    },
  ): string {
    const payload = req.user;
    return payload.userId ?? payload.sub ?? payload.id ?? '';
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Prepare a prayer request (returns rephrased text for confirmation)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rephrased prayer returned for confirmation',
  })
  @TrackActivity('prayer_create_manual', { body: ['category', 'isPublic'] })
  async createPrayer(
    @Body() createPrayerDto: CreatePrayerDto,
    @Req()
    req: Request & {
      user: UserPayload & {
        userId?: string;
        sub?: string;
        id?: string;
        jti?: string;
      };
    },
  ) {
    const payload = req.user as UserPayload & {
      userId?: string;
      sub?: string;
      id?: string;
    };
    const userId = payload.userId ?? payload.sub ?? payload.id;
    const result = await this.prayerService.createPrayer(
      createPrayerDto,
      userId as string,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Request successful',
      data: result,
    };
  }

  @Post(':id/confirm')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate AI prayer for an existing prayer (owner only)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI prayer generated for existing prayer',
  })
  @TrackActivity('prayer_generate_ai', { params: ['id'] })
  async confirmAndGeneratePrayer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('finalRequest') finalRequest: string | undefined,
    @Req()
    req: Request & {
      user: UserPayload & {
        userId?: string;
        sub?: string;
        id?: string;
        jti?: string;
      };
    },
  ): Promise<Prayer> {
    const payload = req.user as UserPayload & {
      userId?: string;
      sub?: string;
      id?: string;
      jti?: string;
    };
    const userId = payload.userId ?? payload.sub ?? payload.id;

    return this.prayerService.confirmAndGeneratePrayer(
      id,
      finalRequest,
      userId,
    );
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all prayers for the current user (paginated)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Prayer list returned successfully',
  })
  async getAllPrayers(
    @Req() req: Request & { user: UserPayload },
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const userId = this.extractUserId(req);

    const result = await this.prayerService.getAllPrayersPaginated(
      userId,
      Number(page),
      Number(limit),
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Prayers retrieved successfully',
      ...result,
    };
  }

  @Get('pray/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a single prayer (owner only)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Prayer retrieved successfully',
  })
  async getPrayer(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: UserPayload },
  ) {
    const userId = this.extractUserId(req);

    const prayer = await this.prayerService.getPrayerById(id, userId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Prayer retrieved successfully',
      data: prayer,
    };
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update an existing prayer (owner only)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Prayer updated successfully',
  })
  async updatePrayer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePrayerDto: UpdatePrayerDto,
    @Req() req: Request & { user: UserPayload },
  ) {
    const userId = this.extractUserId(req);

    const updated = await this.prayerService.updatePrayer(
      id,
      updatePrayerDto,
      userId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Prayer updated successfully',
      data: updated,
    };
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a prayer request (owner only)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Prayer deleted successfully',
  })
  async deletePrayer(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: UserPayload },
  ) {
    const userId = this.extractUserId(req);

    await this.prayerService.deletePrayer(id, userId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Prayer deleted successfully',
    };
  }
}
