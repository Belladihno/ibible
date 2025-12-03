import { Controller, Get, Query } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName } from './queue-names.enum';
import { JobSummary } from 'src/shared/interfaces/sales.interface';

@Controller('admin/queue')
export class QueueController {
  constructor(
    @InjectQueue(QueueName.WAITLIST_SYNC)
    private readonly waitlistQueue: Queue,
  ) {}

  @Get('waitlist/jobs')
  async getRecentWaitlistJobs(
    @Query('limit') limitQuery?: string,
  ): Promise<{ jobs: JobSummary[] }> {
    const limit = Math.max(1, Math.min(100, Number(limitQuery) || 20));

    const types = [
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    ] as const;

    const jobsAccumulator: JobSummary[] = [];

    // Fetch jobs per state up to `limit` each and tag with state
    await Promise.all(
      types.map(async (type) => {
        try {
          const jobs = await this.waitlistQueue.getJobs([type], 0, limit - 1);

          for (const job of jobs) {
            jobsAccumulator.push({
              id: job.id,
              name: job.name,
              data: job.data,
              state: type,
              attemptsMade: job.attemptsMade,
              failedReason: job.failedReason ?? null,
              timestamp: job.timestamp,
              processedOn: (job as any).processedOn ?? null,
              finishedOn: (job as any).finishedOn ?? null,
            });
          }
        } catch (err) {
          // ignore and continue
        }
      }),
    );

    // Sort by timestamp descending
    jobsAccumulator.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    return { jobs: jobsAccumulator.slice(0, limit) };
  }
}
