import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrayerReminderService } from './prayer-reminder.service';
import {
  PrayerReminder,
  ReminderType,
} from 'src/entities/prayer-reminder.entity';
import { Prayer } from 'src/entities/prayer.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PrayerReminderService', () => {
  let service: PrayerReminderService;
  let reminderRepo: Partial<Repository<PrayerReminder>>;
  let prayerRepo: Partial<Repository<Prayer>>;

  const mockReminderRepo: Partial<Repository<PrayerReminder>> = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  const mockPrayerRepo: Partial<Repository<Prayer>> = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrayerReminderService,
        {
          provide: getRepositoryToken(PrayerReminder),
          useValue: mockReminderRepo,
        },
        { provide: getRepositoryToken(Prayer), useValue: mockPrayerRepo },
      ],
    }).compile();

    service = module.get<PrayerReminderService>(PrayerReminderService);
    // cast to locals for easier access in tests
    reminderRepo = module.get(getRepositoryToken(PrayerReminder));
    prayerRepo = module.get(getRepositoryToken(Prayer));
  });

  afterEach(() => jest.clearAllMocks());

  describe('createReminder', () => {
    it('throws NotFoundException when prayer missing', async () => {
      (prayerRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.createReminder('user-id', {
          prayerId: 'p1',
          type: ReminderType.MORNING,
        } as unknown as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a reminder with date range and time', async () => {
      const prayer = { id: 'p1', userId: 'user-id' } as Prayer;
      (prayerRepo.findOne as jest.Mock).mockResolvedValue(prayer);

      const created = {
        id: 'r1',
        prayerId: 'p1',
        type: ReminderType.MORNING,
        customTime: '08:30',
        customStartDate: new Date('2025-11-27'),
        customEndDate: new Date('2025-12-27'),
        isActive: true,
        prayer,
      } as PrayerReminder;

      (reminderRepo.create as jest.Mock).mockReturnValue(created);
      (reminderRepo.save as jest.Mock).mockResolvedValue(created);

      const result = await service.createReminder('user-id', {
        prayerId: 'p1',
        type: ReminderType.MORNING,
        customTime: '08:30',
        customStartDate: '2025-11-27',
        customEndDate: '2025-12-27',
        isActive: true,
      } as any);

      expect(reminderRepo.create).toHaveBeenCalled();
      expect(reminderRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(
        expect.objectContaining({ id: 'r1', prayerId: 'p1' }),
      );
    });

    it('requires both start and end date when one provided', async () => {
      const prayer = { id: 'p1', userId: 'user-id' } as Prayer;
      (prayerRepo.findOne as jest.Mock).mockResolvedValue(prayer);

      await expect(
        service.createReminder('user-id', {
          prayerId: 'p1',
          type: ReminderType.MORNING,
          customStartDate: '2025-11-27',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserReminders', () => {
    it('returns only reminders belonging to user', async () => {
      const prayerA = { id: 'p1', userId: 'user-a' } as Prayer;
      const prayerB = { id: 'p2', userId: 'user-b' } as Prayer;

      const reminders = [
        { id: 'r1', prayer: prayerA },
        { id: 'r2', prayer: prayerB },
      ] as PrayerReminder[];

      (reminderRepo.find as jest.Mock).mockResolvedValue(reminders);

      const result = await service.getUserReminders('user-a');
      expect(result).toHaveLength(1);
      expect(result[0].prayer.id).toBe('p1');
    });
  });

  describe('deleteReminder', () => {
    it('throws NotFoundException when reminder not found', async () => {
      (reminderRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.deleteReminder('user-id', 'r1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes reminder when owned', async () => {
      const prayer = { id: 'p1', userId: 'user-id' } as Prayer;
      const reminder = { id: 'r1', prayer } as PrayerReminder;
      (reminderRepo.findOne as jest.Mock).mockResolvedValue(reminder);
      (reminderRepo.delete as jest.Mock).mockResolvedValue({});

      const res = await service.deleteReminder('user-id', 'r1');
      expect(reminderRepo.delete).toHaveBeenCalledWith({ id: 'r1' });
      expect(res).toEqual({ deleted: true });
    });
  });
});
