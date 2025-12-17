import { Controller, Post, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { EarlyAccessService } from './early-access.service';
import { CreateEarlyAccessDto } from './dto/create-early-access.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('early-access')
@Controller('early-access')
export class EarlyAccessController {
  constructor(private readonly earlyAccessService: EarlyAccessService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ short: { limit: 1, ttl: 1000 } })
  @Throttle({ long: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit an early access request' })
  @ApiBody({ type: CreateEarlyAccessDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Success! Your early access request has been submitted.',
    schema: {
      example: {
        message: 'Success! Your early access request has been submitted.',
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
    status: HttpStatus.CONFLICT,
    description: 'This email is already registered for early access.',
    schema: {
      example: {
        statusCode: HttpStatus.CONFLICT,
        message: 'This email is already registered for early access.',
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
  create(@Body() createEarlyAccessDto: CreateEarlyAccessDto) {
    return this.earlyAccessService.create(createEarlyAccessDto);
  }
}
