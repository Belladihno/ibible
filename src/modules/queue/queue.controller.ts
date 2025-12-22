import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JobSummary } from 'src/shared/interfaces/sales.interface';
import { QueueManagerService } from './queue.service';
import { QueueName } from './queue-names.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '../user/enums/user.enums';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/queue')
export class QueueController {
  constructor(private readonly queueManagerService: QueueManagerService) {}

  @Get('health')
  async getWaitlistQueueHealth() {
    return this.queueManagerService.getQueueHealth(QueueName.WAITLIST_SYNC);
  }

  @Post('clean')
  async cleanWaitlistQueue(@Query('olderThanMs') olderThanMs?: string) {
    const olderThan = olderThanMs ? parseInt(olderThanMs, 10) : undefined;
    await this.queueManagerService.cleanQueue(
      QueueName.WAITLIST_SYNC,
      olderThan,
    );
    return {
      success: true,
      message: 'Queue cleaning process has been initiated.',
    };
  }

  @Delete('waitlist/jobs/failed')
  async deleteFailedJobs(@Body('jobIds') jobIds: string[]): Promise<{
    success: boolean;
    deletedCount: number;
    failedDeletes: { jobId: string; reason: string }[];
    message: string;
  }> {
    return this.queueManagerService.deleteFailedJobs(jobIds);
  }

  @Delete('waitlist/jobs/all-failed')
  async deleteAllFailedJobs(@Query('limit') limitQuery?: string): Promise<{
    success: boolean;
    deletedCount: number;
    message: string;
  }> {
    const limit = limitQuery ? parseInt(limitQuery, 10) : null;
    return this.queueManagerService.deleteAllFailedJobs(limit);
  }

  @Get('waitlist/jobs')
  async getRecentWaitlistJobs(
    @Query('limit') limitQuery?: string,
  ): Promise<{ jobs: JobSummary[] }> {
    const limit = Math.max(1, Math.min(100, Number(limitQuery) || 20));
    const jobs = await this.queueManagerService.getRecentWaitlistJobs(limit);
    return { jobs };
  }

  @Post('waitlist/jobs/:jobId/retry')
  async retryFailedJob(
    @Param('jobId') jobId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.queueManagerService.retryFailedJob(jobId);
  }

  @Post('waitlist/jobs/retry-all-failed')
  async retryAllFailedJobs(@Query('limit') limitQuery?: string): Promise<{
    success: boolean;
    retriedCount: number;
    failedRetries: number;
    message: string;
  }> {
    const limit = Math.max(1, Math.min(1000, Number(limitQuery) || 100));
    return this.queueManagerService.retryAllFailedJobs(limit);
  }
}
