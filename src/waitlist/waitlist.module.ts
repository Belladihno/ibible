import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitlistEntry } from './schemas/waitlist-entry.entity';
import { WaitlistService } from './waitlist.service';
import { WaitlistController } from './waitlist.controller';
import { WaitListEntryModelAction } from 'src/actions/model-actions';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([WaitlistEntry]),MailModule],
  controllers: [WaitlistController],
  providers: [WaitlistService,WaitListEntryModelAction],
  exports:[WaitListEntryModelAction]
})
export class WaitlistModule {}
