import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitlistService } from './waitlist.service';
import { WaitlistController } from './waitlist.controller';
import { WaitListEntryModelAction } from 'src/actions/model-actions';
import { EmailModule } from 'src/module/email/email.module';
import { WaitlistEntry } from 'src/waitlist/schemas/waitlist-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WaitlistEntry]), EmailModule],
  controllers: [WaitlistController],
  providers: [WaitlistService, WaitListEntryModelAction],
  exports: [WaitListEntryModelAction],
})
export class WaitlistModule {}
