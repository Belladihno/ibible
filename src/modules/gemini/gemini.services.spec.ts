import { Test, TestingModule } from '@nestjs/testing';
import { GeminiService } from './gemini.service';
import { ConfigService } from '@nestjs/config';
import { ReaFeature, ChatRole } from 'src/shared/enums';

describe('GeminiService', () => {
  let service!: GeminiService;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = {
      get: jest.fn().mockReturnValue('test-api-key'),
    };

    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(GeminiService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws if API key is missing', async () => {
    configService.get.mockReturnValueOnce(undefined);

    expect(() => {
      new GeminiService(configService as any);
    }).toThrow('OPENROUTER_API_KEY is required');
  });

  it('calls OpenRouter and returns content', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hello from AI' } }],
      }),
    });

    const result = await service.generate(ReaFeature.CHAT, 'Hello');

    expect(result).toBe('Hello from AI');
    expect(fetch).toHaveBeenCalled();
  });

  it('throws if OpenRouter returns no content', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    await expect(service.generate(ReaFeature.CHAT, 'Hello')).rejects.toThrow();
  });

  it('throws if HTTP response is not ok', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(service.generate(ReaFeature.CHAT, 'Hello')).rejects.toThrow();
  });

  describe('parseJsonArray', () => {
    it('returns parsed array if valid', () => {
      const result = service.parseJsonArray<string>('["a", "b"]');
      expect(result).toEqual(['a', 'b']);
    });

    it('returns empty array if invalid JSON', () => {
      const result = service.parseJsonArray<string>('invalid');
      expect(result).toEqual([]);
    });

    it('returns empty array if JSON is not array', () => {
      const result = service.parseJsonArray<string>('{"a":1}');
      expect(result).toEqual([]);
    });
  });
});
