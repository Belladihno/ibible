import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { BibleService } from './bible.service';
import { BibleBookDto } from './dto/bible-book.dto';

@ApiTags('Bible')
@Controller('bible')
export class BibleController {
  constructor(private readonly bibleService: BibleService) {}

  @Get('books')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all Bible books',
    description:
      'Returns a list of all Bible books from cache or external API. Books are cached in the database after first fetch.',
  })
  @ApiResponse({
    status: 200,
    description: 'Books retrieved successfully',
    type: [BibleBookDto],
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  @ApiQuery({
    name: 'testament',
    required: false,
    enum: ['old', 'new'],
    description: 'Filter books by testament',
  })
  @ApiQuery({
    name: 'refresh',
    required: false,
    type: Boolean,
    description: 'Force refresh from external API',
  })
  async getAllBooks(
    @Query('testament') testament?: 'old' | 'new',
    @Query('refresh') refresh?: string,
  ) {
    const forceRefresh = refresh === 'true';
    if (testament) {
      const books = await this.bibleService.getBooksByTestament(testament);
      return {
        success: true,
        data: books,
        count: books.length,
        testament,
      };
    }
    const books = await this.bibleService.getAllBooks(forceRefresh);

    return {
      success: true,
      data: books,
      count: books.length,
      cached: !forceRefresh,
    };
  }
}
