import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InstantlyService } from '../services/instantly.service';
import { ApolloService } from '../services/apollo.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaitlistEntry } from 'src/entities/waitlist-entry.entity';
import {
  WaitlistSyncJob,
  SalesToolResponse,
} from 'src/shared/interfaces/sales.interface';

@Processor('waitlist-sync')
export class WaitlistSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(WaitlistSyncProcessor.name);

  constructor(
    private readonly instantlyService: InstantlyService,
    private readonly apolloService: ApolloService,
    @InjectRepository(WaitlistEntry)
    private readonly waitlistRepo: Repository<WaitlistEntry>,
  ) {
    super();
  }

  private normalizeResult(
    result: PromiseSettledResult<SalesToolResponse>,
  ): string | null {
    if (result.status === 'fulfilled') {
      return result.value.success
        ? null
        : (result.value.error ?? 'Unknown error');
    }
    return result.reason instanceof Error
      ? result.reason.message
      : String(result.reason);
  }

  async process(job: Job<WaitlistSyncJob>): Promise<void> {
    const { email, name } = job.data;
    this.logger.log(`Processing waitlist sync for: ${email}`);

    // Sync to both tools in parallel
    const [instantlyResult, apolloResult] = await Promise.allSettled([
      this.instantlyService.addLead(email, name),
      this.apolloService.addLead(email, name),
    ]);

    const instantlyError = this.normalizeResult(instantlyResult);
    const apolloError = this.normalizeResult(apolloResult);

    if (!instantlyError) {
      this.logger.log(`Successfully synced ${email} to Instantly`);
    } else {
      this.logger.error(
        `Failed to sync ${email} to Instantly: ${instantlyError}`,
      );
      throw new Error(`Instantly sync failed: ${instantlyError}`);
    }

    if (!apolloError) {
      this.logger.log(`Successfully synced ${email} to Apollo`);
    } else {
      this.logger.error(`Failed to sync ${email} to Apollo: ${apolloError}`);
      throw new Error(`Apollo sync failed: ${apolloError}`);
    }

    this.logger.log(`Completed waitlist sync for: ${email}`);

    // Mark the waitlist entry as synced to sales tools if we have an id
    const entryId = job.data?.id;

    if (entryId != null) {
      try {
        await this.waitlistRepo.update(entryId, {
          salesSyncedAt: new Date(),
        });
        this.logger.log(`Marked waitlist entry ${entryId} as salesSynced`);
      } catch (error: unknown) {
        this.logger.error(
          `Failed to mark waitlist entry ${entryId} as salesSynced`,
          error as Error,
        );
        // Do not throw here — syncing succeeded but marking failed; we don't want to trigger a retry
      }
    }
  }
}
