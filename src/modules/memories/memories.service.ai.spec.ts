import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MemoriesService } from './memories.service';
import { AiMemoryService } from './ai-memory.service';
import { Memory } from './schemas/memory.schema';

describe('MemoriesService (AI integration)', () => {
  let service: MemoriesService;
  let constructedData: Partial<Memory> | null = null;
  let saveMock: jest.Mock;

  beforeEach(async () => {
    saveMock = jest.fn();

    // fake model constructor capturing constructed data
    const FakeModel: any = function (this: any, data: Partial<Memory>) {
      constructedData = data;
      return { save: saveMock };
    } as any;

    // when save is called, resolve with an object that has toJSON applying schema transform
    saveMock.mockImplementation(async () => ({
      toJSON: () =>
        ({
          ...(constructedData as Partial<Memory>),
          _id: 'saved-id',
        }) as Record<string, unknown>,
    }));

    const mockAi: Partial<AiMemoryService> = {
      rephraseMemory: jest.fn().mockResolvedValue('AI rephrased memory'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoriesService,
        { provide: getModelToken(Memory.name), useValue: FakeModel },
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
    expect(constructedData).not.toBeNull();
    const cd = constructedData as Partial<Memory>;
    expect(cd.aiRephrase).toBeDefined();
    expect(cd.aiRephrase?.text).toBe('AI rephrased memory');
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
