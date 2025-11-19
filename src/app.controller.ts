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
  })
  @Get()
  getHome(@Req() req: Request) {
    return this.appService.getWelcomeMessage(req);
  }

  @ApiOperation({ summary: 'Sync Swagger documentation with Postman' })
  @ApiResponse({
    status: 200,
    description: 'Swagger documentation successfully synced with Postman',
  })
  @Post('sync')
  async syncSwagger() {
    await this.swaggerSyncService.syncSwagger();
    return { message: 'Swagger documentation synced with Postman' };
  }
}
