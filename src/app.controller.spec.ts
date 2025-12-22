import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import type { Request } from 'express';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
    expect(appService).toBeDefined();
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
      scalar: 'http://localhost:3000/api/v1/reference',
      swagger: 'http://localhost:3000/api/v1/docs',
    });
    expect(typeof result.data.timestamp).toBe('string');
  });

  // Add more tests here to validate the logic
});
