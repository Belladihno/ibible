import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrayerService } from './prayer.service';
import { Prayer } from 'src/entities/prayer.entity';
import { TempPrayer } from 'src/entities/temp-prayer.entity';
import { PrayerReminder } from 'src/entities/prayer-reminder.entity';
import { AiPrayerService } from './ai-prayer.service';
import { CreatePrayerDto } from './dto/create-prayer.dto';

describe('PrayerService', () => {
  let service: PrayerService;
  let prayerRepo: Partial<Repository<Prayer>>;
  let tempRepo: Partial<Repository<TempPrayer>>;
  let aiService: Partial<AiPrayerService>;

  const mockPrayerRepo: Partial<Repository<Prayer>> = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockTempRepo: Partial<Repository<TempPrayer>> = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockReminderRepo: Partial<Repository<PrayerReminder>> = {};

  const mockAiService: Partial<AiPrayerService> = {
    rephrasePrayerRequest: jest.fn().mockResolvedValue('Rephrased request'),
    generatePrayer: jest.fn().mockResolvedValue('Generated prayer'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrayerService,
        { provide: getRepositoryToken(Prayer), useValue: mockPrayerRepo },
        { provide: getRepositoryToken(TempPrayer), useValue: mockTempRepo },
        {
          provide: getRepositoryToken(PrayerReminder),
          useValue: mockReminderRepo,
        },
        { provide: AiPrayerService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<PrayerService>(PrayerService);
    prayerRepo = module.get(getRepositoryToken(Prayer));
    tempRepo = module.get(getRepositoryToken(TempPrayer));
    aiService = module.get(AiPrayerService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createPrayer', () => {
    it('saves rephrased request to temp and returns tempId', async () => {
      (aiService.rephrasePrayerRequest as jest.Mock).mockResolvedValue(
        'rephrased text',
      );

      const createdTemp = {
        id: 'temp-1',
        originalRequest: 'original',
        rephrasedRequest: 'rephrased text',
        type: 'self',
      } as TempPrayer;

      (tempRepo.create as jest.Mock).mockReturnValue(createdTemp);
      (tempRepo.save as jest.Mock).mockResolvedValue(createdTemp);

      const result = await service.createPrayer(
        { originalRequest: 'original', type: 'self' } as CreatePrayerDto,
        'user-1',
      );
      expect(aiService.rephrasePrayerRequest).toHaveBeenCalledWith(
        'original',
        'self',
        'user-1',
      );
      expect(tempRepo.save).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          tempId: 'temp-1',
          rephrasedRequest: 'rephrased text',
        }),
      );
    });
  });

  describe('confirmAndGeneratePrayer', () => {
    it('persists a new Prayer when temp exists and deletes temp', async () => {
      // no persisted prayer
      (prayerRepo.findOne as jest.Mock).mockResolvedValue(null);

      const temp = {
        id: 'temp-1',
        originalRequest: 'orig',
        rephrasedRequest: 'rephrased',
        type: 'self',
        userId: 'user-1',
      } as TempPrayer;

      (tempRepo.findOne as jest.Mock).mockResolvedValue(temp);
      (aiService.generatePrayer as jest.Mock).mockResolvedValue('ai prayer');

      const createdPrayer = {
        id: 'p1',
        originalRequest: 'orig',
        rephrasedRequest: 'rephrased',
        aiPrayer: 'ai prayer',
        userId: 'user-1',
      } as Prayer;

      (prayerRepo.create as jest.Mock).mockReturnValue(createdPrayer);
      (prayerRepo.save as jest.Mock).mockResolvedValue(createdPrayer);

      const result = await service.confirmAndGeneratePrayer(
        'temp-1',
        undefined,
        'user-1',
      );
      expect(tempRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'temp-1' },
      });
      expect(aiService.generatePrayer).toHaveBeenCalledWith(
        'rephrased',
        'self',
        'user-1',
      );
      expect(prayerRepo.save).toHaveBeenCalledWith(createdPrayer);
      expect(tempRepo.delete).toHaveBeenCalledWith({ id: 'temp-1' });
      expect(result).toEqual(createdPrayer);
    });

    it('updates existing persisted prayer with generated aiPrayer', async () => {
      const prayer = {
        id: 'p1',
        originalRequest: 'orig',
        rephrasedRequest: 'rephrased',
        type: 'self',
        userId: 'user-1',
      } as Prayer;

      (prayerRepo.findOne as jest.Mock).mockResolvedValue(prayer);
      (aiService.generatePrayer as jest.Mock).mockResolvedValue(
        'generated text',
      );
      (prayerRepo.save as jest.Mock).mockResolvedValue({
        ...prayer,
        aiPrayer: 'generated text',
      });

      const res = await service.confirmAndGeneratePrayer(
        'p1',
        undefined,
        'user-1',
      );
      expect(aiService.generatePrayer).toHaveBeenCalledWith(
        'rephrased',
        'self',
        'user-1',
      );
      expect(prayerRepo.save).toHaveBeenCalled();
      expect(res.aiPrayer).toBe('generated text');
    });
  });
});
