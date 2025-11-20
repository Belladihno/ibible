import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SwaggerSyncService } from 'nestjs-swagger-sync';
import type { Request } from 'express';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;
  let swaggerSyncService: SwaggerSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: SwaggerSyncService,
          useValue: { syncSwagger: jest.fn() },
        },
      ],
    }).compile();

    appController = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
    swaggerSyncService = module.get<SwaggerSyncService>(SwaggerSyncService);
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
    expect(appService).toBeDefined();
    expect(swaggerSyncService).toBeDefined();
  });

  it('should return welcome message', () => {
    const mockRequest = { headers: {} } as Request;
    const mockResponse = {
      message: 'Welcome!',
      data: {
        description: 'API for REA Interactive Bible',
        version: '1.0.0',
        status: 'running',
        docs: {
          scalar: '/api/v1/reference',
          swagger: '/api/v1/docs',
        },
      },
    };
    jest.spyOn(appService, 'getWelcomeMessage').mockReturnValue(mockResponse);

    const result = appController.getHome(mockRequest);
    expect(result).toEqual(mockResponse);
  });

  // Add more tests here to validate the logic
});
