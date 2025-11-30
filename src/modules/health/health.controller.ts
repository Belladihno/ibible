import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Returns the health status of the application',
    schema: {
      example: {
        statusCode: 200,
        message: 'Health check successful',
        data: {
          status: 'ok',
          checks: {
            database: { status: 'up', detail: 'Connection successful' },
            smtp: { status: 'up', detail: 'SMTP verified' },
            mongodb: { status: 'up', detail: 'MongoDB connected' },
            redis: { status: 'up', detail: 'Redis ping successful' },
            gemini: { status: 'up', detail: 'Gemini API responded' },
            bibleApi: { status: 'up', detail: 'Bible API responded' },
          },
          timestamp: '2025-11-20T00:00:00.000Z',
        },
      },
    },
  })
  async check() {
    const result = await this.healthService.check();
    return {
      statusCode: 200,
      message: 'Health check successful',
      data: { ...result, timestamp: new Date().toISOString() },
    };
  }
}
