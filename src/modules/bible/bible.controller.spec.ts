import { Test, TestingModule } from '@nestjs/testing';
import { BibleController } from './bible.controller';
import { BibleService } from './bible.service';

describe('BibleController', () => {
  let controller: BibleController;
  let service: BibleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BibleController],
      providers: [BibleService],
    }).compile();

    controller = module.get<BibleController>(BibleController);
    service = module.get<BibleService>(BibleService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  // Add more tests here to validate the logic
});
