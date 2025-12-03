import { Test, TestingModule } from '@nestjs/testing';
import { DiscoverController } from './discover.controller';
import { DiscoverService } from './discover.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEmotion } from 'src/entities/user-emotions.entity';
import { User } from 'src/entities/user.entity';
import { GeminiService } from '../chat/services/gemini.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from 'src/guards/auth.guard';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../redis/redis.service';

describe('DiscoverController', () => {
  let controller: DiscoverController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscoverController],
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
          provide: JwtService,
          useValue: {},
        },
        {
          provide: AuthGuard,
          useValue: {},
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<DiscoverController>(DiscoverController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
