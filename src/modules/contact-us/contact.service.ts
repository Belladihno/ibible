import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Contact } from 'src/entities/contact-us.entity';
import { Repository } from 'typeorm';
import { CreateContactDto } from './dto/contact-us.dto';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {}

  async createContact(createContactDto: CreateContactDto): Promise<Contact> {
    try {
      const contact = this.contactRepository.create(createContactDto);
      return await this.contactRepository.save(contact);
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to save contact message. Please try again later.',
      );
    }
  }
}
