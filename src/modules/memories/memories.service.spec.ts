import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MemoriesService } from './memories.service';
import { Memory } from './schemas/memory.schema';
import { AiMemoryService } from './ai-memory.service';
import { RedisService } from '../redis/redis.service';

describe('MemoriesService', () => {
  let service: MemoriesService;

  const mockMemoryModel = {
    new: jest.fn().mockResolvedValue({}),
    constructor: jest.fn().mockResolvedValue({}),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
  };

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoriesService,
        {
          provide: getModelToken(Memory.name),
          useValue: mockMemoryModel,
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
        _id: memoryId,
        userId: userId,
        title: 'Test Memory',
        body: 'This is a test memory.',
        toObject: () => ({
          id: memoryId,
          userId: userId,
          title: 'Test Memory',
          body: 'This is a test memory.',
        }),
      };
      mockMemoryModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMemory),
      });
      const result = await service.findById(memoryId);
      expect(result).not.toBeNull();
      expect(result?.id).toEqual(memoryId);
    });

    it('should return null if memory not found', async () => {
      const memoryId = 'non-existent-id';
      mockMemoryModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      const result = await service.findById(memoryId);
      expect(result).toBeNull();
    });
  });
});
