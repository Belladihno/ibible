import {
  Controller,
  HttpStatus,
  Post,
  UseGuards,
  Body,
  Request,
  Get,
  Delete,
  Param,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { BookmarkService } from './bookmark.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import * as SYM from 'src/shared/constants/systemMessages';

@ApiTags('Bookmark')
@Controller('bookmark')
export class BookmarkController {
  constructor(private readonly bookmarks: BookmarkService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a bookmark for user' })
  @ApiBody({ type: CreateBookmarkDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: SYM.BOOKMARK_CREATED,
    schema: {
      example: {
        statusCode: HttpStatus.CREATED,
        message: SYM.BOOKMARK_CREATED,
        data: {
          text: 'Jesus wept',
          verse: 'john 3:16',
          createdAt: '2025-11-20T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SYM.INVALID_PAYLOAD_OR_BOOKMARK_ALREADY,
    schema: {
      example: {
        statusCode: HttpStatus.BAD_REQUEST,
        message: SYM.VERSE_ALREADY_BOOKMARKED,
      },
    },
  })
  async createBookmark(@Body() createDto: CreateBookmarkDto, @Request() req) {
    const userId = req.user.id;
    const response = await this.bookmarks.createBookmark(createDto, userId);
    return {
      statusCode: HttpStatus.CREATED,
      message: SYM.BOOKMARK_CREATED,
      data: {
        bookmark: response,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: SYM.BOOKMARK_FOR_USER,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SYM.FETCH_BOOKMARK_LIST,
    schema: {
      example: {
        statusCode: HttpStatus.OK,
        message: SYM.BOOKMARK_FETCHED,
        data: [
          {
            id: 'uuid-1234-5678',
            text: 'Jesus wept',
            verse: 'john 3:16',
            createdAt: '2025-11-24T12:00:00.000Z',
          },
          {
            id: 'uuid-8765-4321',
            text: 'In the beginnig God created Heaven and earth',

            verse: 'Genesis 1:1',
            createdAt: '2025-11-24T12:05:00.000Z',
          },
        ],
      },
    },
  })
  async getBookmark(@Request() req) {
    const userId = req.user.id;
    const bookmarks = await this.bookmarks.GetBookmarks(userId);

    return {
      statusCode: HttpStatus.OK,
      message: SYM.BOOKMARK_FETCHED,
      data: {
        bookmarks: bookmarks,
        timestamp: Date.now(),
      },
    };
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: SYM.DELETE_BY_ID,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SYM.DELETE_BOOKMARK,
    schema: {
      example: {
        statusCode: HttpStatus.OK,
        message: SYM.DELETE_BOOKMARK,
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SYM.BOOKMARK_NOT_FOUND,
    schema: {
      example: {
        statusCode: HttpStatus.BAD_REQUEST,
        message: SYM.BOOKMARK_NOT_FOUND,
      },
    },
  })
  async deleteBookmark(@Param('id') id: string) {
    await this.bookmarks.deleteBookmarks(id);

    return {
      statusCode: HttpStatus.OK,
      message: SYM.DELETE_BOOKMARK,
    };
  }
}
