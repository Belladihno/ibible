import { AiMemoryService } from './ai-memory.service';

describe('AiMemoryService', () => {
  let service: AiMemoryService;

  const mockGeminiService: any = {
    generateContent: jest.fn(),
  };

  beforeEach(() => {
    service = new AiMemoryService(mockGeminiService);
  });

  afterEach(() => jest.resetAllMocks());

  it('rephrases and cleans result from Gemini', async () => {
    mockGeminiService.generateContent.mockResolvedValueOnce(
      'Rephrased: "A concise rephrase."',
    );
    const out = await service.rephraseMemory('My title', 'The body text');
    expect(out).toBe('A concise rephrase.');
  });

  it('removes leading labels and quotes', async () => {
    mockGeminiService.generateContent.mockResolvedValueOnce(
      'Here is a rephrased memory: "Saved by grace."',
    );
    const out = await service.rephraseMemory('', 'Saved by grace.');
    expect(out).toBe('Saved by grace.');
  });
});
