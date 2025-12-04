import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { QueueName } from './queue-names.enum';
import { JobSummary } from 'src/shared/interfaces/sales.interface';

@Injectable()
export class QueueManagerService {
  private readonly logger = new Logger(QueueManagerService.name);

  constructor(
    @InjectQueue(QueueName.WAITLIST_SYNC)
    private waitlistQueue: Queue,
  ) {}

  async getQueueHealth(queueName: QueueName) {
    try {
      const queue = this.waitlistQueue;

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      return {
        name: queueName,
        waiting,
        active,
        completed,
        failed,
        delayed,
        isPaused: await queue.isPaused(),
      };
    } catch (error) {
      this.logger.error(`Failed to get queue health for ${queueName}`, error);
      throw error;
    }
  }

  async cleanQueue(queueName: QueueName, olderThanMs: number = 86400000) {
    try {
      const queue = this.waitlistQueue;
      await queue.clean(olderThanMs, 100, 'completed');
      await queue.clean(olderThanMs * 7, 100, 'failed');
      this.logger.log(`Cleaned queue: ${queueName}`);
    } catch (error) {
      this.logger.error(`Failed to clean queue ${queueName}`, error);
    }
  }

  async getRecentWaitlistJobs(limit: number): Promise<JobSummary[]> {
    const types = [
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    ] as const;
    const jobsAccumulator: JobSummary[] = [];

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
              timestamp: this.toISOString(job.timestamp),
              processedOn: this.toISOString(job.processedOn),
              finishedOn: this.toISOString(job.finishedOn),
            });
          }
        } catch (err) {
          this.logger.error(`Failed to get jobs of type ${type}`, err);
        }
      }),
    );

    jobsAccumulator.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
    return jobsAccumulator.slice(0, limit);
  }

  private toISOString(timestamp: number | null | undefined): string | null {
    if (!timestamp) {
      return null;
    }
    return new Date(timestamp).toISOString();
  }

  async retryFailedJob(
    jobId: string,
  ): Promise<{ success: boolean; message: string }> {
    const job = await this.waitlistQueue.getJob(jobId);
    if (!job) {
      return { success: false, message: `Job ${jobId} not found` };
    }
    try {
      await job.retry();
      return {
        success: true,
        message: `Job ${jobId} has been requeued for retry`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to retry job ${jobId}: ${errorMessage}`,
      };
    }
  }

  async retryAllFailedJobs(limit: number): Promise<{
    success: boolean;
    retriedCount: number;
    failedRetries: number;
    message: string;
  }> {
    try {
      const failedJobs = await this.waitlistQueue.getJobs(
        ['failed'],
        0,
        limit - 1,
      );
      if (failedJobs.length === 0) {
        return {
          success: true,
          retriedCount: 0,
          failedRetries: 0,
          message: 'No failed jobs found to retry',
        };
      }

      let retriedCount = 0;
      let failedRetries = 0;
      await Promise.all(
        failedJobs.map(async (job) => {
          try {
            await job.retry();
            retriedCount++;
          } catch (error) {
            failedRetries++;
          }
        }),
      );
      return {
        success: failedRetries === 0,
        retriedCount,
        failedRetries,
        message: `Retried ${retriedCount} failed jobs${
          failedRetries > 0 ? `, ${failedRetries} failed to retry` : ''
        }`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        retriedCount: 0,
        failedRetries: 0,
        message: `Failed to retry jobs: ${errorMessage}`,
      };
    }
  }

  async deleteFailedJobs(jobIds: string[]): Promise<{
    success: boolean;
    deletedCount: number;
    failedDeletes: { jobId: string; reason: string }[];
    message: string;
  }> {
    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return {
        success: false,
        deletedCount: 0,
        failedDeletes: [],
        message: 'No job IDs provided',
      };
    }

    let deletedCount = 0;
    const failedDeletes: { jobId: string; reason: string }[] = [];

    for (const jobId of jobIds) {
      try {
        const job = await this.waitlistQueue.getJob(jobId);
        if (!job) {
          failedDeletes.push({ jobId, reason: 'Job not found' });
          continue;
        }

        const state = await job.getState();
        if (state !== 'failed') {
          failedDeletes.push({
            jobId,
            reason: `Job is not in a failed state (current state: ${state})`,
          });
          continue;
        }

        await job.remove();
        deletedCount++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        failedDeletes.push({ jobId, reason: errorMessage });
      }
    }

    return {
      success: failedDeletes.length === 0,
      deletedCount,
      failedDeletes,
      message: `Deleted ${deletedCount} failed jobs. ${
        failedDeletes.length > 0
          ? `Failed to delete ${failedDeletes.length} jobs.`
          : ''
      }`,
    };
  }

  async deleteAllFailedJobs(
    limit: number | null,
  ): Promise<{ success: boolean; deletedCount: number; message: string }> {
    const end = limit ? limit - 1 : -1;
    try {
      const failedJobs = await this.waitlistQueue.getJobs(['failed'], 0, end);
      if (failedJobs.length === 0) {
        return {
          success: true,
          deletedCount: 0,
          message: 'No failed jobs found to delete.',
        };
      }
      const results = await Promise.allSettled(
        failedJobs.map((job) => job.remove()),
      );
      const successfullyDeleted = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      if (successfullyDeleted < failedJobs.length) {
        return {
          success: false,
          deletedCount: successfullyDeleted,
          message: `Deleted ${successfullyDeleted} out of ${failedJobs.length} failed jobs. Some deletions failed.`,
        };
      }
      return {
        success: true,
        deletedCount: successfullyDeleted,
        message: `Successfully deleted ${successfullyDeleted} failed jobs.`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        deletedCount: 0,
        message: `Failed to delete jobs: ${errorMessage}`,
      };
    }
  }
}
