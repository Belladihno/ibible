import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiQuery,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BibleService } from './bible.service';
import { LogReadingSessionDto } from './dto/log-reading-session.dto';

@ApiTags('Bible')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('bible')
export class BibleController {
  constructor(private readonly bibleService: BibleService) {}

  // GET /bible/versions
  @ApiOperation({ summary: 'List available Bible versions' })
  @ApiOkResponse({
    description: 'Available Bible versions',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              abbreviation: { type: 'string' },
              language: { type: 'string' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      example: {
        data: [
          {
            id: 'de4e12af7f28f599-02',
            name: 'English Standard Version',
            abbreviation: 'ESV',
            language: 'en',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        ],
      },
    },
  })
  @Get('versions')
  async getVersions(): Promise<Record<string, unknown>> {
    return this.bibleService.getBibleVersions();
  }

  // GET /bible/books
  // Optional JSON body: { "bibleId": "<bible-id>" }
  @ApiOperation({ summary: 'List books for a Bible (optional bibleId body)' })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        bibleId: { type: 'string' },
      },
      example: {
        bibleId: 'de4e12af7f28f599-02',
      },
    },
  })
  @ApiOkResponse({
    description: 'Books list',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              bibleId: { type: 'string' },
              abbreviation: { type: 'string' },
              name: { type: 'string' },
              nameLong: { type: 'string' },
              chapters: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
      example: {
        data: [
          {
            id: 'GEN',
            bibleId: 'de4e12af7f28f599-02',
            abbreviation: 'Gen',
            name: 'Genesis',
            nameLong: 'The Book of Genesis',
          },
        ],
      },
    },
  })
  @Get('books')
  async getBooks(
    @Body() body?: { bibleId?: string },
  ): Promise<Record<string, unknown>> {
    const requestedBibleId = body?.bibleId;
    return await this.bibleService.getBooks(requestedBibleId);
  }

  // GET /bible/:book/:chapter
  @ApiOperation({ summary: 'Get a chapter (bible-api.com format)' })
  @ApiOkResponse({
    description: 'Chapter with verses (free Bible API)',
    schema: {
      type: 'object',
      properties: {
        reference: { type: 'string', example: 'Genesis 1' },
        translation: { type: 'string', example: 'King James Version' },
        verses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              book: { type: 'string', example: 'Genesis' },
              chapter: { type: 'integer', example: 1 },
              verse: { type: 'integer', example: 1 },
              text: {
                type: 'string',
                example:
                  'In the beginning God created the heavens and the earth.',
              },
            },
          },
        },
      },
      example: {
        reference: 'Genesis 1',
        translation: 'King James Version',
        verses: [
          {
            book: 'Genesis',
            chapter: 1,
            verse: 1,
            text: 'In the beginning God created the heavens and the earth.',
          },
          {
            book: 'Genesis',
            chapter: 1,
            verse: 2,
            text: 'And the earth was without form...',
          },
        ],
      },
    },
  })
  @Get(':book/:chapter')
  async getChapter(
    @Param('book') book: string,
    @Param('chapter') chapter: number,
  ): Promise<Record<string, unknown>> {
    return this.bibleService.getBookChapter(book, chapter);
  }


  // GET /bible/verse?verseId=genesis1:1
  @ApiOperation({ summary: 'Get a single verse (bible-api.com format)' })
  @ApiQuery({
    name: 'verseId',
    required: true,
    description: 'Format: genesis1:1 or john3:16 (case-insensitive)',
  })
  @ApiOkResponse({
    description: 'Single verse from the free Bible API',
    schema: {
      type: 'object',
      properties: {
        reference: { type: 'string', example: 'Genesis 1:1' },
        translation: { type: 'string', example: 'King James Version' },
        verses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              book: { type: 'string', example: 'Genesis' },
              chapter: { type: 'integer', example: 1 },
              verse: { type: 'integer', example: 1 },
              text: {
                type: 'string',
                example:
                  'In the beginning God created the heaven and the earth.',
              },
            },
          },
        },
      },
      example: {
        reference: 'Genesis 1:1',
        translation: 'King James Version',
        verses: [
          {
            book: 'Genesis',
            chapter: 1,
            verse: 1,
            text: 'In the beginning God created the heaven and the earth.',
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Missing or invalid verseId' })
  @Get('verse')
  async getVerse(
    @Query('verseId') verseId: string,
  ): Promise<Record<string, unknown>> {
    if (!verseId) throw new BadRequestException('verseId is required');
    return this.bibleService.getVerse(verseId);
  }
  @ApiBadRequestResponse({ description: 'Missing query parameter' })
  @Get('search')
  async search(
    @Query('query') query: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<Record<string, unknown>> {
    if (!query) throw new BadRequestException('query is required');
    return this.bibleService.search(
      query,
      Number(limit) || 10,
      Number(offset) || 0,
    );
  }

  // POST /bible/read
  @ApiOperation({ summary: 'Log a reading session (demo-only)' })
  @ApiBody({
    schema: {
      example: {
        userId: 'user-123',
        bibleId: 'de4e12af7f28f599-02',
        book: 'GEN',
        chapter: '1',
        verse: '1',
        version: 'ESV',
        timestamp: '2025-11-24T12:00:00Z',
      },
    },
  })
  @ApiOkResponse({
    description: 'Logging result',
    schema: {
      example: {
        success: true,
      },
    },
  })
  @Post('read')
  async logReadingSession(
    @Body() body: LogReadingSessionDto,
  ): Promise<{ success: boolean }> {
    return this.bibleService.logReadingSession(
      body as unknown as Record<string, unknown>,
    );
  }

  // GET /bible/audio/:book/:chapter?audioBibleId=xxx
  @Get('audio/:book/:chapter')
  @ApiOperation({ summary: 'Get an audio chapter (audioBibleId optional)' })
  @ApiQuery({
    name: 'audioBibleId',
    required: false,
    description:
      'Optional audioBibleId. If omitted the default `105a06b6146d11e7-01` (English - World English Bible 2013, Drama NT) will be used — NOTE: this default is New Testament only.',
  })
  @ApiOkResponse({
    description: 'Audio chapter metadata',
    schema: {
      example: {
        id: 'GEN.1',
        audioUrl: 'https://cdn.example.org/audio/105a06b6/GEN.1.mp3',
        title: 'Genesis 1',
      },
    },
  })
  async getAudioChapter(
    @Param('book') book: string,
    @Param('chapter') chapter: string,
    @Query('audioBibleId') audioBibleId?: string,
  ): Promise<Record<string, unknown>> {
    const audioId = audioBibleId || '105a06b6146d11e7-01';
    const chapterId = `${book.toUpperCase()}.${chapter}`;
    return this.bibleService.getAudioChapter(audioId, chapterId);
  }

  // GET /bible/audio-bibles
  @ApiOperation({ summary: 'List available audio Bible collections' })
  @ApiOkResponse({
    description: 'Audio bibles list',
    schema: {
      example: {
        data: [
          {
            id: '105a06b6146d11e7-01',
            name: 'World English Bible 2013 - Drama (NT)',
          },
        ],
      },
    },
  })
  @Get('audio-bibles')
  async getAudioBibles(): Promise<Record<string, unknown>> {
    return this.bibleService.getAudioBibles();
  }

  // GET /bible/read-logs
  @ApiOperation({ summary: 'Get all reading session logs' })
  @ApiOkResponse({
    description: 'Array of reading session logs',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          bibleId: { type: 'string' },
          book: { type: 'string' },
          chapter: { type: 'string' },
          verse: { type: 'string' },
          version: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
        example: {
          id: 'log-1',
          userId: 'user-123',
          bibleId: 'de4e12af7f28f599-02',
          book: 'GEN',
          chapter: '1',
          verse: '1',
          version: 'ESV',
          timestamp: '2025-11-24T12:00:00Z',
        },
      },
    },
  })
  @Get('read-logs')
  async getReadingLogs() {
    return this.bibleService.getReadingLogs();
  }
}
