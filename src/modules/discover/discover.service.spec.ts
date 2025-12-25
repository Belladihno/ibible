import { Test, TestingModule } from '@nestjs/testing';
import { DiscoverService } from './discover.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEmotion } from 'src/entities/user-emotions.entity';
import { User } from 'src/entities/user.entity';
import { RedisService } from '../redis/redis.service';
import { BibleService } from '../bible/bible.service';
import { GeminiService } from '../gemini/gemini.service';

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
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: BibleService,
          useValue: {
            getVerse: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DiscoverService>(DiscoverService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
