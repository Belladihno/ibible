import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import {WaitlistEntry } from './schemas/waitlist-entry.entity';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(WaitlistEntry)
    private waitlistRepo: Repository<WaitlistEntry>,
  ) {}

  async create(createWaitlistEntryDto: CreateWaitlistEntryDto) {
    const { email, name } = createWaitlistEntryDto;

    const entry = this.waitlistRepo.create({
      email,
      name,
    });

    try {
      const saved = await this.waitlistRepo.save(entry);

      return {
        message: 'Success! You are on the waitlist.',
        email: saved.email,
        name: saved.name,
        id: saved.id,
      };
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('This email is already on the waitlist.');
      }

      throw new InternalServerErrorException();
    }
  }

  async findAll() {
    return this.waitlistRepo.find();
  }
}
