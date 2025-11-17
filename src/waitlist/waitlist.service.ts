import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { WaitlistEntry } from './schemas/waitlist-entry.entity';
import { WaitListEntryModelAction } from 'src/actions/model-actions';

@Injectable()
export class WaitlistService {
  constructor(
    private readonly WaitlEntryModelAction: WaitListEntryModelAction,
  ) {}

  async create(createWaitlistEntryDto: CreateWaitlistEntryDto) {
    const { email, name } = createWaitlistEntryDto;

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

    try {
      return {
        message: 'Success! You are on the waitlist.',
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
