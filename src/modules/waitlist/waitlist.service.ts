import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName } from '../queue/queue-names.enum';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { WaitListEntryModelAction } from 'src/actions/model-actions';
import { EmailService } from 'src/modules/email/email.service';
import { EmailTemplateId } from 'src/modules/email/constants/email-template.enum';
import { EmailPayload } from 'src/shared/types/email.types';
import { WaitlistSyncJob } from 'src/shared/interfaces/sales.interface';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private readonly WaitlEntryModelAction: WaitListEntryModelAction,
    private readonly emailService: EmailService,
    @InjectQueue(QueueName.WAITLIST_SYNC)
    private readonly waitlistQueue: Queue<WaitlistSyncJob>,
  ) {}

  async create(createWaitlistEntryDto: CreateWaitlistEntryDto) {
    const { email, name } = createWaitlistEntryDto;

    try {
      const entry = await this.WaitlEntryModelAction.create({
        createPayload: {
          ...createWaitlistEntryDto,
          email: email,
          name: name,
        },
        transactionOptions: {
          useTransaction: false,
        },
      });

      // Send welcome email
      this.sendWelcomeEmail(entry.email, entry.name).catch((error) => {
        this.logger.error(
          `Failed to send welcome email to ${entry.email}`,
          error,
        );
      });

      // Queue background job to sync with sales tools
      try {
        const job = await this.waitlistQueue.add(
          'sync-to-sales-tools',
          {
            id: entry.id,
            email: entry.email,
            name: entry.name,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: {
              age: 3600, // 1 hour
              count: 100,
            },
            removeOnFail: {
              age: 86400, // 24 hours
              count: 500,
            },
          },
        );

        this.logger.log(
          `Queued sales sync job ${job.id} for email: ${entry.email}`,
        );
      } catch (queueError) {
        // Log but don't fail the request if queue is down
        this.logger.error(
          `Failed to queue sales sync for ${entry.email}`,
          queueError,
        );
      }

      return {
        message: 'Success! User added to the waitlist.',
        email: entry.email,
        name: entry.name,
      };
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('This email is already on the waitlist.');
      }

      this.logger.error('Failed to create waitlist entry', error);
      throw new InternalServerErrorException();
    }
  }

  private async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const emailPayload: EmailPayload<EmailTemplateId.WAITLIST> = {
      to: [{ email, name }],
      subject: 'Thank you for joining our waitlist!',
      templateId: EmailTemplateId.WAITLIST,
      templateData: {
        name: name || 'There',
        unsubscribeUrl: '#',
      },
    };

    await this.emailService.sendMail(emailPayload);
  }

  async findAll(page: number = 1, limit: number = 10) {
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit));

    try {
      const { payload, paginationMeta } = await this.WaitlEntryModelAction.list(
        {
          paginationPayload: {
            page: validPage,
            limit: validLimit,
          },
          order: {
            createdAt: 'DESC',
          },
        },
      );

      return {
        data: payload,
        meta: {
          page: paginationMeta.page || validPage,
          limit: paginationMeta.limit || validLimit,
          total: paginationMeta.total || payload.length,
          totalPages:
            paginationMeta.total_pages ||
            Math.ceil((paginationMeta.total || payload.length) / validLimit),
        },
      };
    } catch (error) {
      this.logger.error('Failed to retrieve waitlist entries', error);
      throw new InternalServerErrorException(
        'Failed to retrieve waitlist entries',
      );
    }
  }
}
