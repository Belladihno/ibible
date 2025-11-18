import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { WaitListEntryModelAction } from 'src/actions/model-actions';
import { EmailService } from 'src/email/email.service';
import { EmailTemplateId } from 'src/email/constants/email-template.enum';
import { EmailPayload } from 'src/email/types/email.types';

@Injectable()
export class WaitlistService {
  constructor(
    private readonly WaitlEntryModelAction: WaitListEntryModelAction,
    private readonly emailService: EmailService,
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
        },
      };

      await this.emailService.sendMail(emailPayload);

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

  async findAll() {
    const { payload } = await this.WaitlEntryModelAction.list({});
    return {
      data: payload,
    };
  }
}
