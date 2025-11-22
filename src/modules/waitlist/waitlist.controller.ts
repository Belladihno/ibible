import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('waitlist')
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  @Throttle({ short: { limit: 1, ttl: 1000 } })
  @Throttle({ long: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Add a new entry to the waitlist' })
  @ApiBody({ type: CreateWaitlistEntryDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Success! You are on the waitlist.',
    schema: {
      example: {
        message: 'Success! User added to the waitlist.',
        email: 'jane.doe@example.com',
        name: 'Jane Doe',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid email format or validation error.',
    schema: { example: { status: 'error', message: 'Invalid email format' } },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'This email is already on the waitlist.',
    schema: {
      example: {
        statusCode: HttpStatus.CONFLICT,
        message: 'This email is already on the waitlist.',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Too many requests. Please try again later.',
    schema: {
      example: {
        status: 'error',
        message: 'Too many requests. Please try again later.',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error.',
  })
  create(@Body() createWaitlistEntryDto: CreateWaitlistEntryDto) {
    return this.waitlistService.create(createWaitlistEntryDto);
  }

  /*  @Get()
  @Throttle({ short: { limit: 10, ttl: 1000 } })
  @Throttle({ long: { limit: 100, ttl: 60000 } })
  @ApiOperation({ summary: 'Retrieve all waitlist entries with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of entries per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated array of waitlist entries with metadata.',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests. Please try again later.',
  })
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.waitlistService.findAll(page, limit);
  } */
}
