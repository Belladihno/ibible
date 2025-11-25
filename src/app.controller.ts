import { Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SwaggerSyncService } from 'nestjs-swagger-sync';

@ApiTags('home')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly swaggerSyncService: SwaggerSyncService,
  ) {}

  @ApiOperation({ summary: 'Get welcome message' })
  @ApiResponse({
    status: 200,
    description: 'Returns the welcome message from the service',
    schema: {
      example: {
        message: 'Welcome to REA - Interactive Bible App API',
        data: {
          description: 'A friend that brings you closer to God',
          version: '1.0.0',
          status: 'active',
          docs: {
            scalar: 'http://localhost:3000/api/v1/reference',
            swagger: 'http://localhost:3000/api/v1/docs',
          },
        },
      },
    },
  })
  @Get()
  getHome(@Req() req: Request) {
    const result = this.appService.getWelcomeMessage(req);
    return {
      statusCode: 200,
      message: 'Welcome to REA - Interactive Bible App API',
      data: {
        ...result.data,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @ApiOperation({ summary: 'Sync Swagger documentation with Postman' })
  @ApiResponse({
    status: 200,
    description: 'Swagger documentation successfully synced with Postman',
    schema: {
      example: { message: 'Swagger documentation synced with Postman' },
    },
  })
  @Post('sync')
  async syncSwagger() {
    await this.swaggerSyncService.syncSwagger();
    return {
      statusCode: 200,
      message: 'Swagger documentation synced with Postman',
      data: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
