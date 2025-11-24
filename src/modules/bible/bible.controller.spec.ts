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

  it('should return reading logs from the service', async () => {
    const logs = [
      {
        id: 'log-1',
        userId: 'user-123',
        bibleId: 'de4e12af7f28f599-02',
        book: 'GEN',
        chapter: '1',
        verse: '1',
        version: 'ESV',
        timestamp: '2025-11-24T12:00:00Z',
      },
    ];
    jest.spyOn(service, 'getReadingLogs').mockResolvedValueOnce(logs as any);
    const result = await controller.getReadingLogs();
    expect(result).toEqual(logs);
    expect(service.getReadingLogs).toHaveBeenCalled();
  });
});
