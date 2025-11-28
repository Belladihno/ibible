import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpStatus,
  UseGuards,
  Req,
  Get,
  Patch,
  Delete,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiBody,
} from '@nestjs/swagger';
import { UserPayload } from 'src/modules/user/strategy/interface';
import { CreateReminderDto } from '../dto/create-reminder.dto';
import { UpdateReminderDto } from '../dto/update-reminder.dto';
import { PrayerReminderService } from './prayer-reminder.service';

import * as SYM from 'src/shared/constants/systemMessages';

@Controller('prayers')
export class PrayerReminderController {
  constructor(private readonly prayerReminder: PrayerReminderService) {}

  @Post(':prayerId/reminders')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a reminder for a specific prayer (owner only)',
  })
  @ApiBody({ type: CreateReminderDto })
  @ApiCreatedResponse({
    description: SYM.REMINDER_CREATED,
  })
  @ApiBadRequestResponse({ description: SYM.REMINDER_INVALID_PAYLOAD })
  @ApiNotFoundResponse({
    description: SYM.PRAYER_NOT_FOUND_OR_NOT_OWNED,
  })
  async createReminder(
    @Param('prayerId', ParseUUIDPipe) prayerId: string,
    @Body() createReminderDto: CreateReminderDto,
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
    const payload = req.user;
    const userId = payload.userId ?? payload.sub ?? payload.id;

    if (createReminderDto.prayerId !== prayerId) {
      throw new BadRequestException(SYM.PRAYER_ID_MISMATCH);
    }

    const reminder = await this.prayerReminder.createReminder(
      userId as string,
      createReminderDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: SYM.REMINDER_CREATED,
      data: reminder,
    };
  }

  @Get('reminders')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get the authenticated user's reminders",
  })
  @ApiOkResponse({
    description: SYM.REMINDERS_FETCHED,
  })
  async getUserReminders(
    @Req()
    req: Request & {
      user: UserPayload & { userId?: string; sub?: string; id?: string };
    },
  ) {
    const payload = req.user;
    const userId = payload.userId ?? payload.sub ?? payload.id;

    const reminders = await this.prayerReminder.getUserReminders(
      userId as string,
    );

    return {
      statusCode: HttpStatus.OK,
      message: SYM.REMINDERS_FETCHED,
      data: reminders,
    };
  }

  @Get('reminders/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single reminder by id (owner only)' })
  @ApiOkResponse({ description: SYM.REMINDER_FETCHED })
  @ApiNotFoundResponse({ description: SYM.REMINDER_NOT_OWNED })
  async getReminderById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req()
    req: Request & {
      user: UserPayload & { userId?: string; sub?: string; id?: string };
    },
  ) {
    const payload = req.user;
    const userId = payload.userId ?? payload.sub ?? payload.id;

    const reminder = await this.prayerReminder.getReminderById(
      userId as string,
      id,
    );

    if (!reminder) throw new NotFoundException(SYM.REMINDER_NOT_OWNED);

    return {
      statusCode: HttpStatus.OK,
      message: SYM.REMINDER_FETCHED,
      data: reminder,
    };
  }

  @Patch('reminders/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a reminder (owner only)' })
  @ApiBody({ type: UpdateReminderDto })
  @ApiOkResponse({ description: SYM.REMINDER_UPDATED })
  @ApiBadRequestResponse({ description: SYM.REMINDER_INVALID_PAYLOAD })
  @ApiNotFoundResponse({
    description: SYM.REMINDER_NOT_OWNED,
  })
  async updateReminder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateReminderDto,
    @Req()
    req: Request & {
      user: UserPayload & { userId?: string; sub?: string; id?: string };
    },
  ) {
    const payload = req.user;
    const userId = payload.userId ?? payload.sub ?? payload.id;

    const reminder = await this.prayerReminder.updateReminder(
      userId as string,
      id,
      updateDto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: SYM.REMINDER_UPDATED,
      data: reminder,
    };
  }

  @Delete('reminders/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a reminder (owner only)' })
  @ApiOkResponse({ description: SYM.REMINDER_DELETED })
  @ApiNotFoundResponse({
    description: SYM.REMINDER_NOT_OWNED,
  })
  async deleteReminder(
    @Param('id', ParseUUIDPipe) id: string,
    @Req()
    req: Request & {
      user: UserPayload & { userId?: string; sub?: string; id?: string };
    },
  ) {
    const payload = req.user;
    const userId = payload.userId ?? payload.sub ?? payload.id;

    const result = await this.prayerReminder.deleteReminder(
      userId as string,
      id,
    );

    return {
      statusCode: HttpStatus.OK,
      message: SYM.REMINDER_DELETED,
      data: result,
    };
  }
}
