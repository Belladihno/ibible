import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InstantlyService } from '../services/instantly.service';
import { ApolloService } from '../services/apollo.service';
import { QueueName } from '../../queue/queue-names.enum';
import {
  WaitlistSyncJob,
  SalesToolResponse,
} from 'src/shared/interfaces/sales.interface';

@Processor(QueueName.WAITLIST_SYNC, {
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000,
  },
})
export class WaitlistSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(WaitlistSyncProcessor.name);

  constructor(
    private readonly instantlyService: InstantlyService,
    private readonly apolloService: ApolloService,
  ) {
    super();
  }

  @OnWorkerEvent('active')
  onActive(job: Job<WaitlistSyncJob>) {
    this.logger.log(
      `Processing job ${job.id} for email: ${job.data.email} (Attempt ${job.attemptsMade + 1}/${job.opts.attempts})`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<WaitlistSyncJob>) {
    this.logger.log(`Completed job ${job.id} for email: ${job.data.email}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<WaitlistSyncJob> | undefined, error: Error) {
    if (job) {
      this.logger.error(
        `Failed job ${job.id} for email: ${job.data.email}`,
        error.stack,
      );
    } else {
      this.logger.error('Job failed with unknown job data', error.stack);
    }
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

    try {
      // Sync to both tools in parallel
      const [instantlyResult, apolloResult] = await Promise.allSettled([
        this.instantlyService.addLead(email, name),
        this.apolloService.addLead(email, name),
      ]);

      const instantlyError = this.normalizeResult(instantlyResult);
      const apolloError = this.normalizeResult(apolloResult);

      const errors: string[] = [];
      const successes: string[] = [];

      if (!instantlyError) {
        successes.push('Instantly');
        this.logger.log(`Successfully synced ${email} to Instantly`);
      } else {
        errors.push(`Instantly: ${instantlyError}`);
        this.logger.error(
          `Failed to sync ${email} to Instantly: ${instantlyError}`,
        );
      }

      if (!apolloError) {
        successes.push('Apollo');
        this.logger.log(`Successfully synced ${email} to Apollo`);
      } else {
        errors.push(`Apollo: ${apolloError}`);
        this.logger.error(`Failed to sync ${email} to Apollo: ${apolloError}`);
      }

      // Decision: Fail the job only if BOTH services failed
      if (errors.length === 2) {
        throw new Error(
          `All sales tools failed for ${email}: ${errors.join('; ')}`,
        );
      }

      // If at least one succeeded, consider it a success
      if (successes.length > 0) {
        this.logger.log(
          `Partially successful sync for ${email}. Succeeded: ${successes.join(', ')}`,
        );
      }

      // Store job results for potential retrieval
      await job.updateProgress({
        instantlySuccess: !instantlyError,
        apolloSuccess: !apolloError,
        errors,
      });

      this.logger.log(`Completed waitlist sync for: ${email}`);
    } catch (error) {
      this.logger.error(
        `Error processing waitlist sync for ${email}:`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }
}
