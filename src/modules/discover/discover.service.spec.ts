import { Test, TestingModule } from '@nestjs/testing';
import { DiscoverService } from './discover.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEmotion } from 'src/entities/user-emotions.entity';
import { User } from 'src/entities/user.entity';
import { GeminiService } from '../chat/services/gemini.service';

describe('DiscoverService', () => {
  let service: DiscoverService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoverService,
        {
          provide: getRepositoryToken(UserEmotion),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: GeminiService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<DiscoverService>(DiscoverService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
