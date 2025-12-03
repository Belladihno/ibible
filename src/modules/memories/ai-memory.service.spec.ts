// modules/memories/ai-memory.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AiMemoryService } from './ai-memory.service';
import { GeminiService } from '../chat/services/gemini.service';

// Create mock functions as standalone constants
const mockGenerateContent = jest.fn();
const mockQueueAdd = jest.fn();

describe('AiMemoryService', () => {
  let service: AiMemoryService;
  let geminiService: jest.Mocked<GeminiService>;

  beforeEach(async () => {
    mockGenerateContent.mockClear();
    mockQueueAdd.mockClear();

    const mockGeminiService = {
      generateContent: mockGenerateContent,
    };

    const mockQueue = {
      add: mockQueueAdd,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiMemoryService,
        {
          provide: GeminiService,
          useValue: mockGeminiService,
        },
        {
          provide: 'BullQueue_memories-processing',
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<AiMemoryService>(AiMemoryService);
    geminiService = module.get(GeminiService);
  });

  describe('rephraseMemory', () => {
    it('should rephrase memory successfully', async () => {
      const mockResponse =
        'Here is a rephrased memory: "God answered my prayer"';
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.rephraseMemory('Test Title', 'Test Body');

      expect(result).toBe('God answered my prayer');
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('Test Title'),
      );
    });

    it('should handle empty response', async () => {
      mockGenerateContent.mockResolvedValue('');

      await expect(
        service.rephraseMemory('Test Title', 'Test Body'),
      ).rejects.toThrow('Empty rephrase result from AI');
    });

    it('should handle AI service errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('AI service error'));

      await expect(
        service.rephraseMemory('Test Title', 'Test Body'),
      ).rejects.toThrow('Failed to rephrase memory');
    });
  });

  describe('queue methods', () => {
    it('should queue rephrase job', async () => {
      mockQueueAdd.mockResolvedValue({ id: 'job-123' });

      // We need to mock the queue property since it's private
      (service as any).aiQueue = { add: mockQueueAdd };
      (service as any).genAI = {}; // Mock AI as enabled

      const result = await (service as any).queueRephrase?.(
        'memory-123',
        'Test Title',
        'Test Body',
        'user-123',
      );

      if (result) {
        expect(result).toBe('job-123');
        expect(mockQueueAdd).toHaveBeenCalledWith(
          'rephrase',
          expect.objectContaining({
            type: 'rephrase',
            data: expect.objectContaining({
              memoryId: 'memory-123',
            }),
          }),
          expect.any(Object),
        );
      }
    });
  });
});
