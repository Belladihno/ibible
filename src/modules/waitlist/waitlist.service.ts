import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { WaitListEntryModelAction } from 'src/actions/model-actions';
import { EmailService } from 'src/modules/email/email.service';
import { EmailTemplateId } from 'src/modules/email/constants/email-template.enum';
import { EmailPayload } from 'src/shared/types/email.types';
import { WaitlistSyncJob } from 'src/shared/interfaces/sales.interface';

@Injectable()
export class WaitlistService {
  constructor(
    private readonly WaitlEntryModelAction: WaitListEntryModelAction,
    private readonly emailService: EmailService,
    @InjectQueue('waitlist-sync')
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

      const emailPayload: EmailPayload<EmailTemplateId.WAITLIST> = {
        to: [
          {
            email: entry.email,
            name: entry.name,
          },
        ],
        subject: 'Thank you for joining our waitlist!',
        templateId: EmailTemplateId.WAITLIST,
        templateData: {
          name: entry.name || 'There',
          // TODO: Implement waitlist unsubscribe functionality
          unsubscribeUrl: '#',
        },
      };

      await this.emailService.sendMail(emailPayload);

      // Queue background job to sync with sales tools
      await this.waitlistQueue.add(
        'sync-to-sales-tools',
        {
          email: entry.email,
          name: entry.name,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      return {
        message: 'Success! User added to the waitlist.',
        email: entry.email,
        name: entry.name,
      };
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('This email is already on the waitlist.');
      }

      throw new InternalServerErrorException();
    }
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
    } catch {
      throw new InternalServerErrorException(
        'Failed to retrieve waitlist entries',
      );
    }
  }
}
