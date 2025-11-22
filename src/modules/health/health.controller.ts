import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import * as SYM from 'src/shared/constant/systemMessages';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the health status of the application',
    schema: {
      example: {
        statusCode: HttpStatus.OK,
        message: 'Health check successful',
        data: {
          status: 'ok',
          checks: {
            database: { status: 'up', detail: 'Connection successful' },
            smtp: { status: 'up', detail: 'SMTP verified' },
          },
          timestamp: '2025-11-20T00:00:00.000Z',
        },
      },
    },
  })
  async check() {
    const result = await this.healthService.check();
    return {
      statusCode: HttpStatus.OK,
      message: SYM.HEALTH_SUCCESS,
      data: { ...result, timestamp: new Date().toISOString() },
    };
  }
}
