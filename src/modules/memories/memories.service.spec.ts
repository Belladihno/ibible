// modules/memories/memories.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { MemoriesService } from './memories.service';
import { AiMemoryService } from './ai-memory.service';
import { RedisService } from '../redis/redis.service';
import { Memory } from './schemas/memory.schema';
import { Queue } from 'bullmq';

// Fixed MockRedisService
class MockRedisService {
  private store = new Map<string, string>();

  async get<T>(key: string): Promise<T | null> {
    const data = this.store.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T; // Fixed: type assertion
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    this.store.set(key, serialized);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const keys = Array.from(this.store.keys()).filter((key) =>
      key.includes(pattern.replace('*', '')),
    );
    keys.forEach((key) => this.store.delete(key));
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async increment(key: string): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const next = current + 1;
    await this.set(key, next);
    return next;
  }
}

describe('MemoriesService', () => {
  let service: MemoriesService;
  let mockModel: jest.Mocked<Partial<Model<Memory>>>;

  beforeEach(async () => {
    mockModel = {
      findById: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
    };

    const mockAiService = {
      rephraseMemory: jest.fn(),
      rephrase: jest.fn(),
    };

    const mockQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoriesService,
        { provide: getModelToken(Memory.name), useValue: mockModel },
        { provide: AiMemoryService, useValue: mockAiService },
        { provide: RedisService, useClass: MockRedisService },
        { provide: 'BullQueue_memories-processing', useValue: mockQueue },
      ],
    }).compile();

    service = module.get<MemoriesService>(MemoriesService);
  });

  // Your tests here...
});
