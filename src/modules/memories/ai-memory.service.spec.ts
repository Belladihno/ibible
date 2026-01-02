import { Test, TestingModule } from '@nestjs/testing';
import { AiMemoryService } from './ai-memory.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GeminiService } from '../gemini/gemini.service';

describe('AiMemoryService', () => {
  let service: AiMemoryService;
  let geminiService: { generate: jest.Mock };
  let aiQueue: { add: jest.Mock };

  beforeEach(async () => {
    geminiService = { generate: jest.fn() };
    aiQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiMemoryService,
        { provide: GeminiService, useValue: geminiService },
        { provide: getQueueToken('memories-processing'), useValue: aiQueue },
      ],
    }).compile();

    service = module.get<AiMemoryService>(AiMemoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('aiQueue injection should work', () => {
    expect(service['aiQueue']).toBeDefined();
  });

  it('can add a job to the queue (mocked)', async () => {
    await service['aiQueue'].add('jobName', { data: 'test' });
    expect(aiQueue.add).toHaveBeenCalledWith('jobName', { data: 'test' });
  });

  describe('buildRephrasePrompt', () => {
    it('includes title if provided', () => {
      const prompt = service['buildRephrasePrompt']('My Title', 'Memory body');
      expect(prompt).toContain('Title: My Title');
      expect(prompt).toContain('Memory:');
    });

    it('omits title if empty', () => {
      const prompt = service['buildRephrasePrompt']('', 'Memory body');
      expect(prompt).not.toContain('Title:');
      expect(prompt).toContain('Memory:');
    });
  });

  describe('cleanResult', () => {
    it('trims and removes surrounding quotes', () => {
      const result = service['cleanResult']('" Hello World "');
      expect(result).toBe('Hello World');
    });

    it('removes "Here is a rephrased memory:" prefix', () => {
      const result = service['cleanResult'](
        'Here is a rephrased memory: Hello World',
      );
      expect(result).toBe('Hello World');
    });

    it('leaves clean text unchanged', () => {
      const result = service['cleanResult']('Clean text');
      expect(result).toBe('Clean text');
    });
  });

  describe('rephraseMemory', () => {
    it('returns cleaned text from GeminiService', async () => {
      geminiService.generate.mockResolvedValue({
        content: 'Here is a rephrased memory: Rephrased memory text',
        finishReason: 'stop',
        isComplete: true,
      });
      const result = await service.rephraseMemory('Title', 'Original memory');
      expect(result).toBe('Rephrased memory text');
    });

    it('throws HttpException if Gemini returns empty string', async () => {
      geminiService.generate.mockResolvedValue('');
      await expect(
        service.rephraseMemory('Title', 'Original memory'),
      ).rejects.toThrow();
    });

    it('throws HttpException if GeminiService throws', async () => {
      geminiService.generate.mockRejectedValue(new Error('AI error'));
      await expect(
        service.rephraseMemory('Title', 'Original memory'),
      ).rejects.toThrow();
    });
  });
});

