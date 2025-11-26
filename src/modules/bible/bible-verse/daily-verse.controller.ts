import { Controller, Get, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { DailyVerseResponse } from 'src/shared/types/bible-verse.types';
import { BibleVerseService } from './daily-verse.service';

@ApiTags('Bible Verse')
@Controller('bible-verse')
export class BibleVerseController {
  constructor(private readonly bibleVerseService: BibleVerseService) {}

  @Get('daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get daily Bible verse',
    description:
      'Retrieves the current daily Bible verse. The verse is automatically refreshed every 24 hours at midnight and remains available throughout the day. Each verse includes the reference, text, book details, and translation information.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Daily Bible verse retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          reference: 'John 3:16',
          book: 'John',
          chapter: 3,
          verse: 16,
          text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.',
          translation: {
            identifier: 'web',
            name: 'World English Bible',
            language: 'English',
            language_code: 'eng',
            license: 'Public Domain',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Bible API service is unavailable',
    schema: {
      example: {
        success: false,
        message: 'External Bible API is currently unavailable',
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: 'Service Unavailable',
      },
    },
  })
  async getDailyVerse(): Promise<DailyVerseResponse> {
    const verse = await this.bibleVerseService.getDailyVerse();
    return {
      success: true,
      data: verse,
    };
  }
}
