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
    const mockRequest = {
      protocol: 'http',
      get: () => 'localhost:3000',
    } as unknown as Request;
    const result = appController.getHome(mockRequest);
    // Check all fields except timestamp for equality
    expect(result.statusCode).toBe(200);
    expect(result.message).toBe('Welcome to REA - Interactive Bible App API');
    expect(result.data.description).toBe(
      'A friend that brings you closer to God',
    );
    expect(result.data.version).toBe('1.0.0');
    expect(result.data.status).toBe('active');
    expect(result.data.docs).toEqual({
      scalar: 'http://localhost:3000/reference',
      swagger: 'http://localhost:3000/docs',
    });
    expect(typeof result.data.timestamp).toBe('string');
  });

  // Add more tests here to validate the logic
});
