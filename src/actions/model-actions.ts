import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractModelAction } from '@hng-sdk/orm';
import { WaitlistEntry } from '../waitlist/schemas/waitlist-entry.entity';

@Injectable()
export class WaitListEntryModelAction extends AbstractModelAction<WaitlistEntry> {
  constructor(
    @InjectRepository(WaitlistEntry)
    repository: Repository<WaitlistEntry>,
  ) {
    super(repository, WaitlistEntry);
  }
}
