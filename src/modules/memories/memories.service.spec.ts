import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MemoriesService } from './memories.service';
import { Memory } from '../../entities/memory.entity';
import { AiMemoryService } from './ai-memory.service';
import { RedisService } from '../redis/redis.service';

describe('MemoriesService', () => {
  let service: MemoriesService;
  let memoryRepo: any;

  const mockAiMemoryService = {
    rephraseMemory: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
  };

  beforeEach(async () => {
    memoryRepo = {
      create: jest
        .fn()
        .mockImplementation((dto: Partial<Memory>) => dto as Memory),
      save: jest.fn().mockImplementation((entity: Memory) => {
        const saved = { ...entity } as Memory;
        if (!saved.id) saved.id = 'saved-id';
        return Promise.resolve(saved);
      }),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoriesService,
        {
          provide: getRepositoryToken(Memory),
          useValue: memoryRepo,
        },
        {
          provide: AiMemoryService,
          useValue: mockAiMemoryService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: 'BullQueue_memories-processing',
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MemoriesService>(MemoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a memory if found', async () => {
      const memoryId = 'some-id';
      const userId = 'user-id';
      const mockMemory = {
        id: memoryId,
        userId: userId,
        title: 'Test Memory',
        body: 'This is a test memory.',
      };

      memoryRepo.findOne.mockResolvedValue(mockMemory);

      const result = await service.findById(memoryId);
      expect(result).not.toBeNull();
      expect(result?.id).toEqual(memoryId);
    });

    it('should return null if memory not found', async () => {
      const memoryId = 'non-existent-id';

      memoryRepo.findOne.mockResolvedValue(null);

      const result = await service.findById(memoryId);
      expect(result).toBeNull();
    });
  });
});
