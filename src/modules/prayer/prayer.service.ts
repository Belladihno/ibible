import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Prayer, PrayerStatus } from 'src/entities/prayer.entity';
import { Repository } from 'typeorm';
import { AiPrayerService } from './ai-prayer.service';
import { PrayerReminder } from 'src/entities/prayer-reminder.entity';
import { CreatePrayerDto } from './dto/create-prayer.dto';
import { TempPrayer } from 'src/entities/temp-prayer.entity';

@Injectable()
export class PrayerService {
  constructor(
    @InjectRepository(Prayer)
    private prayerRepository: Repository<Prayer>,
    private aiPrayerService: AiPrayerService,
    @InjectRepository(PrayerReminder)
    private reminderRepository: Repository<PrayerReminder>,
    @InjectRepository(TempPrayer)
    private tempPrayerRepository: Repository<TempPrayer>,
  ) {}

  async createPrayer(
    createPrayerDto: CreatePrayerDto,
    userId: string,
  ): Promise<{
    tempId: string;
    originalRequest: string;
    rephrasedRequest: string;
    type: string;
  }> {
    // Rephrase and save to temporary storage (temp_prayers) with owner information.
    const rephrasedRequest = await this.aiPrayerService.rephrasePrayerRequest(
      createPrayerDto.originalRequest,
      createPrayerDto.type,
    );

    const temp = this.tempPrayerRepository.create({
      type: createPrayerDto.type as any,
      originalRequest: createPrayerDto.originalRequest,
      rephrasedRequest,
      userId,
    });

    const saved = await this.tempPrayerRepository.save(temp);

    return {
      tempId: saved.id,
      originalRequest: saved.originalRequest,
      rephrasedRequest: saved.rephrasedRequest as string,
      type: saved.type as unknown as string,
    };
  }

  async confirmAndGeneratePrayer(
    prayerId: string,
    finalRequest?: string,
    userId?: string,
  ): Promise<Prayer> {
    const logger = new Logger('PrayerService');

    // Try to find an existing persisted prayer first
    const prayer = await this.prayerRepository.findOne({
      where: { id: prayerId },
    });

    // If no persisted prayer, look for a temporary prayer (created via POST /prayers)
    if (!prayer) {
      const temp = await this.tempPrayerRepository.findOne({
        where: { id: prayerId },
      });
      if (!temp) throw new NotFoundException('Prayer not found');
      if (userId && temp.userId !== userId)
        throw new NotFoundException('Prayer not found');

      const rephrased = temp.rephrasedRequest || temp.originalRequest;
      const source =
        finalRequest && finalRequest.trim().length ? finalRequest : rephrased;

      logger.debug(
        `Confirming temp prayer and generating AI for source length=${source.length}`,
      );

      const aiPrayer = await this.aiPrayerService.generatePrayer(
        source,
        temp.type as any,
      );

      const newPrayer = this.prayerRepository.create({
        type: temp.type as any,
        originalRequest: temp.originalRequest,
        rephrasedRequest: rephrased,
        aiPrayer,
        status: PrayerStatus.ONGOING,
        userId: temp.userId,
      });

      const saved = await this.prayerRepository.save(newPrayer);
      // remove temp record after persisting
      await this.tempPrayerRepository.delete({ id: prayerId });
      logger.debug(`Persisted confirmed prayer id=${saved.id}`);
      return saved;
    }

    // persisted prayer exists: enforce ownership if userId provided
    if (userId && prayer.userId !== userId) {
      throw new NotFoundException('Prayer not found');
    }

    const source =
      finalRequest && finalRequest.trim().length
        ? finalRequest
        : prayer.rephrasedRequest || prayer.originalRequest;

    logger.debug(`Generating prayer for source length=${source.length}`);

    prayer.aiPrayer = await this.aiPrayerService.generatePrayer(
      source,
      prayer.type,
    );

    logger.debug(`Generated aiPrayer length=${prayer.aiPrayer?.length ?? 0}`);

    return this.prayerRepository.save(prayer);
  }
}
