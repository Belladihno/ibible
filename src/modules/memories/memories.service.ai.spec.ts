import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MemoriesService } from './memories.service';
import { AiMemoryService } from './ai-memory.service';
import { Memory } from '../../entities/memory.entity';

describe('MemoriesService (AI integration)', () => {
  let service: MemoriesService;
  let saveMock: jest.Mock;
  let createMock: jest.Mock;

  beforeEach(async () => {
    saveMock = jest.fn();
    createMock = jest.fn();

    saveMock.mockImplementation(async (entity: Memory) => {
      const saved = { ...entity } as Memory;
      if (!saved.id) saved.id = 'saved-id';
      return Promise.resolve(saved);
    });

    createMock.mockImplementation((dto: Partial<Memory>) => dto as Memory);

    const mockAi: Partial<AiMemoryService> = {
      rephraseMemory: jest.fn().mockResolvedValue('AI rephrased memory'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoriesService,
        {
          provide: getRepositoryToken(Memory),
          useValue: {
            create: createMock,
            save: saveMock,
          },
        },
        { provide: AiMemoryService, useValue: mockAi },
      ],
    }).compile();

    service = module.get<MemoriesService>(MemoriesService);
  });

  afterEach(() => jest.resetAllMocks());

  it('saves aiRephrase when AiMemoryService returns text', async () => {
    const payload: Partial<Memory> = { title: 'T', body: 'B', tags: ['a'] };
    const res = await service.create('user-1', payload);

    expect(saveMock).toHaveBeenCalled();
    const savedData = saveMock.mock.calls[0][0];

    expect(savedData.aiRephrase).toBeDefined();
    expect(savedData.aiRephrase?.text).toBe('AI rephrased memory');

    expect(res).not.toBeNull();
    const typed = res as Partial<Memory> & {
      id: string;
      aiRephrase?: { text?: string };
    };
    expect(typed.id).toBe('saved-id');
    expect(typed.aiRephrase).toBeDefined();
    expect(typed.aiRephrase?.text).toBe('AI rephrased memory');
  });
});
