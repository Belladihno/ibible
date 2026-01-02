import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiUsageService } from './ai-usage.service';
import { AiUsageLog } from 'src/entities/ai-usage-log.entity';

describe('AiUsageService', () => {
  let service: AiUsageService;
  let repository: Repository<AiUsageLog>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiUsageService,
        {
          provide: getRepositoryToken(AiUsageLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AiUsageService>(AiUsageService);
    repository = module.get<Repository<AiUsageLog>>(
      getRepositoryToken(AiUsageLog),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logUsage', () => {
    const usageData = {
      userId: 'user-uuid',
      feature: 'chat',
      model: 'google/gemini-2.5-flash',
      provider: 'openai',
      inputTokens: 1000000,
      outputTokens: 500000,
      metadata: { temp: 0.7 },
    };

    it('should calculate total tokens and cost and save the log', async () => {
      const expectedTotalTokens = 1500000;
      const expectedCost = (1000000 / 1000000) * 0.1 + (500000 / 1000000) * 0.4; // $0.30

      mockRepository.create.mockReturnValue({
        ...usageData,
        totalTokens: expectedTotalTokens,
        cost: expectedCost,
      });
      mockRepository.save.mockResolvedValue({
        id: 'log-id',
        ...usageData,
        totalTokens: expectedTotalTokens,
        cost: expectedCost,
      });

      await service.logUsage(usageData);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...usageData,
        totalTokens: expectedTotalTokens,
        cost: expectedCost,
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should log an error if logging fails', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'error');
      mockRepository.create.mockReturnValue(usageData);
      mockRepository.save.mockRejectedValue(new Error('DB Error'));

      await service.logUsage(usageData);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to log AI usage: DB Error'),
      );
    });

    it('should handle null userId', async () => {
      const dataWithNullUser = { ...usageData, userId: null };
      mockRepository.create.mockReturnValue(dataWithNullUser);

      await service.logUsage(dataWithNullUser);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
        }),
      );
    });
  });
});
