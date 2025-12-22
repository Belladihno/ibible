import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('home')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

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
}
