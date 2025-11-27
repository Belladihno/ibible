import { Controller, Post, Body, Param, ParseUUIDPipe, HttpStatus, UseGuards, Req } from "@nestjs/common";
import { CreatePrayerDto } from "./dto/create-prayer.dto";
import { PrayerService } from "./prayer.service";
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserPayload } from '../user/strategy/interface.d';
import { Prayer } from "src/entities/prayer.entity";



@Controller('prayers')
export class PrayerController {
  constructor(private readonly prayerService: PrayerService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Prepare a prayer request (returns rephrased text for confirmation)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Rephrased prayer returned for confirmation' })
  async createPrayer(
    @Body() createPrayerDto: CreatePrayerDto,
    @Req() req: Request & { user: UserPayload & { userId?: string; sub?: string; id?: string; jti?: string } },
  ) {
    const payload = req.user as UserPayload & { userId?: string; sub?: string; id?: string };
    const userId = payload.userId ?? payload.sub ?? payload.id;
    const result = await this.prayerService.createPrayer(createPrayerDto, userId as string);
    return {
      statusCode: HttpStatus.OK,
      message: 'Request successful',
      data: result,
    };
  }


  @Post(':id/confirm')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate AI prayer for an existing prayer (owner only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'AI prayer generated for existing prayer' })
  async confirmAndGeneratePrayer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('finalRequest') finalRequest: string | undefined,
    @Req() req: Request & { user: UserPayload & { userId?: string; sub?: string; id?: string; jti?: string } },
  ): Promise<Prayer> {
    const payload = req.user as UserPayload & { userId?: string; sub?: string; id?: string; jti?: string };
    const userId = payload.userId ?? payload.sub ?? payload.id;

    return this.prayerService.confirmAndGeneratePrayer(id, finalRequest, userId);
  }

}