import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Prayer } from 'src/entities/prayer.entity';
import { Repository } from 'typeorm';
import {
  PrayerReminder,
  ReminderType,
} from 'src/entities/prayer-reminder.entity';
import { UpdateReminderDto } from '../dto/update-reminder.dto';
import { CreateReminderDto } from '../dto/create-reminder.dto';

@Injectable()
export class PrayerReminderService {
  constructor(
    @InjectRepository(Prayer)
    private prayerRepository: Repository<Prayer>,
    @InjectRepository(PrayerReminder)
    private reminderRepository: Repository<PrayerReminder>,
  ) {}

  // Reminder CRUD operations
  async createReminder(userId: string, createDto: CreateReminderDto) {
    const {
      prayerId,
      type,
      customTime,
      isActive,
      customStartDate,
      customEndDate,
    } = createDto;

    // ensure prayer exists and belongs to user
    const prayer = await this.prayerRepository.findOne({
      where: { id: prayerId },
    });
    if (!prayer) throw new NotFoundException('Prayer not found');
    if (prayer.userId !== userId)
      throw new NotFoundException('Prayer not found');

    // Handle optional custom date range if provided (allow ranges for any type)
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (type === undefined)
      throw new BadRequestException('Reminder type is required');

    // If either start or end date is provided, require both and validate
    const hasStart = !!customStartDate;
    const hasEnd = !!customEndDate;
    if (hasStart || hasEnd) {
      if (!hasStart || !hasEnd)
        throw new BadRequestException(
          'Both customStartDate and customEndDate must be provided together',
        );

      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      ) {
        throw new BadRequestException(
          'Invalid customStartDate or customEndDate',
        );
      }
      if (startDate > endDate)
        throw new BadRequestException(
          'customStartDate must be before or equal to customEndDate',
        );
    }

    // If reminder type is CUSTOM, require a customTime to be provided
    if (type === ReminderType.CUSTOM && !customTime) {
      throw new BadRequestException(
        'customTime is required for custom reminders',
      );
    }

    const reminder = this.reminderRepository.create({
      type,
      customTime: customTime ?? null,
      customStartDate: startDate,
      customEndDate: endDate,
      isActive: typeof isActive === 'boolean' ? isActive : true,
      prayer,
      prayerId,
    });

    return this.reminderRepository.save(reminder);
  }

  async getUserReminders(userId: string) {
    const rows = await this.reminderRepository.find({ relations: ['prayer'] });
    return rows.filter((r) => r.prayer?.userId === userId);
  }

  async getReminderById(userId: string, id: string) {
    const reminder = await this.reminderRepository.findOne({
      where: { id },
      relations: ['prayer'],
    });
    if (!reminder || !reminder.prayer)
      throw new NotFoundException('Reminder not found');
    if (reminder.prayer.userId !== userId)
      throw new NotFoundException('Reminder not found');
    return reminder;
  }

  async updateReminder(
    userId: string,
    id: string,
    updateDto: UpdateReminderDto,
  ) {
    const reminder = await this.reminderRepository.findOne({
      where: { id },
      relations: ['prayer'],
    });
    if (!reminder || !reminder.prayer)
      throw new NotFoundException('Reminder not found');
    if (reminder.prayer.userId !== userId)
      throw new NotFoundException('Reminder not found');

    // determine the effective type after update
    const effectiveType = updateDto.type ?? reminder.type;

    if (updateDto.type !== undefined) reminder.type = updateDto.type;
    if (updateDto.customTime !== undefined)
      reminder.customTime = updateDto.customTime ?? null;
    if (updateDto.isActive !== undefined)
      reminder.isActive = updateDto.isActive;

    // handle custom date range updates
    if (updateDto.customStartDate !== undefined) {
      const d = new Date(updateDto.customStartDate);
      if (Number.isNaN(d.getTime()))
        throw new BadRequestException('Invalid customStartDate');
      reminder.customStartDate = d;
    }
    if (updateDto.customEndDate !== undefined) {
      const d = new Date(updateDto.customEndDate);
      if (Number.isNaN(d.getTime()))
        throw new BadRequestException('Invalid customEndDate');
      reminder.customEndDate = d;
    }

    // If the effective type is custom, ensure the reminder has a valid time and date range
    if (effectiveType === ReminderType.CUSTOM) {
      const hasTime = !!reminder.customTime;
      const hasStart = !!reminder.customStartDate;
      const hasEnd = !!reminder.customEndDate;
      if (!hasTime)
        throw new BadRequestException(
          'customTime is required for custom reminders',
        );
      if (!hasStart || !hasEnd)
        throw new BadRequestException(
          'customStartDate and customEndDate are required for custom reminders',
        );
      if (reminder.customStartDate! > reminder.customEndDate!)
        throw new BadRequestException(
          'customStartDate must be before or equal to customEndDate',
        );
    }

    return this.reminderRepository.save(reminder);
  }

  async deleteReminder(userId: string, id: string) {
    const reminder = await this.reminderRepository.findOne({
      where: { id },
      relations: ['prayer'],
    });
    if (!reminder || !reminder.prayer)
      throw new NotFoundException('Reminder not found');
    if (reminder.prayer.userId !== userId)
      throw new NotFoundException('Reminder not found');

    await this.reminderRepository.delete({ id });
    return { deleted: true };
  }
}
