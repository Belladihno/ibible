import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import {
  WaitlistEntry,
  WaitlistEntryDocument,
} from './schemas/waitlist-entry.schema';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectModel(WaitlistEntry.name)
    private waitlistEntryModel: Model<WaitlistEntryDocument>,
  ) {}

  async create(createWaitlistEntryDto: CreateWaitlistEntryDto) {
    // Get both email and name from the DTO
    const { email, name } = createWaitlistEntryDto;

    try {
      // Save both email and name to the database
      const newEntry = new this.waitlistEntryModel({ email, name });
      await newEntry.save();

      return {
        message: 'Success! You are on the waitlist.',
        email: newEntry.email,
        name: newEntry.name,
        id: newEntry._id,
      };
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('This email is already on the waitlist.');
      }
      throw new InternalServerErrorException();
    }
  }

  async findAll() {
    return this.waitlistEntryModel.find().exec();
  }
}
