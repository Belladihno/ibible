import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InstantlyService } from 'src/modules/sales/services/instantly.service';
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

    const entryId = job.data?.id;
    let hasErrors = false;
    const errorDetails: string[] = [];

    try {
      // Sync to Instantly
      const [instantlyResult] = await Promise.allSettled([
        this.instantlyService.addLead(email, name),
      ]);

      const instantlyError = this.normalizeResult(instantlyResult);

      // Check if errors are due to missing configuration
      const isInstantlyConfigError = instantlyError?.includes('not configured');

      if (!instantlyError) {
        this.logger.log(`Successfully synced ${email} to Instantly`);
      } else if (isInstantlyConfigError) {
        this.logger.warn(
          `Skipped Instantly sync for ${email}: ${instantlyError}`,
        );
      } else {
        hasErrors = true;
        errorDetails.push(`Instantly: ${instantlyError}`);
        this.logger.error(
          `Failed to sync ${email} to Instantly: ${instantlyError}`,
        );
      }

      if (hasErrors) {
        this.logger.warn(
          `Waitlist sync for ${email} completed with errors: ${errorDetails.join(', ')}`,
        );
      } else {
        this.logger.log(`Completed waitlist sync for: ${email}`);
      }
    } catch (error: unknown) {
      hasErrors = true;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Unexpected error during sync for ${email}: ${errorMessage}`,
      );
    }

    // Always mark the sync attempt (success or failure)
    // This prevents infinite retry loops
    if (entryId != null) {
      try {
        const updateData: Partial<WaitlistEntry> = {
          syncAttemptedAt: new Date(),
        };

        // Only set salesSyncedAt if there were no errors
        if (!hasErrors) {
          updateData.salesSyncedAt = new Date();
        }

        await this.waitlistRepo.update(entryId, updateData);
        const logMsg = hasErrors
          ? `Marked waitlist entry ${entryId} as attempted (with errors)`
          : `Marked waitlist entry ${entryId} as salesSynced`;
        this.logger.log(logMsg);
      } catch (error: unknown) {
        this.logger.error(
          `Failed to update waitlist entry ${entryId}`,
          error as Error,
        );
      }
    }
  }
}
