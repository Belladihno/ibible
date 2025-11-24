import { Test, TestingModule } from '@nestjs/testing';
import { BibleController } from './bible.controller';
import { BibleService } from './bible.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReadingLog } from '../../entities/reading-log.entity';

describe('BibleController', () => {
  let controller: BibleController;
  let service: BibleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BibleController],
      providers: [
        BibleService,
        ConfigService,
        {
          provide: getRepositoryToken(ReadingLog),
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<BibleController>(BibleController);
    service = module.get<BibleService>(BibleService);
    // Prevent open handle warning by mocking redis
    (service as any).redis = { get: jest.fn(), set: jest.fn() };
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  // Add more tests here to validate the logic
});
