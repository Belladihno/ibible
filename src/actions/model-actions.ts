import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractModelAction } from '@hng-sdk/orm';
import { WaitlistEntry } from 'src/entities/waitlist-entry.entity';
import { EarlyAccessEntry } from 'src/entities/early-access-entry.entity';

@Injectable()
export class WaitListEntryModelAction extends AbstractModelAction<WaitlistEntry> {
  constructor(
    @InjectRepository(WaitlistEntry)
    repository: Repository<WaitlistEntry>,
  ) {
    super(repository, WaitlistEntry);
  }
}

@Injectable()
export class EarlyAccessEntryModelAction extends AbstractModelAction<EarlyAccessEntry> {
  constructor(
    @InjectRepository(EarlyAccessEntry)
    repository: Repository<EarlyAccessEntry>,
  ) {
    super(repository, EarlyAccessEntry);
  }
}
