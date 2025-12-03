import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { WaitlistService } from './waitlist.service';
import { WaitlistController } from './waitlist.controller';
import { WaitListEntryModelAction } from 'src/actions/model-actions';
import { EmailModule } from 'src/modules/email/email.module';
import { WaitlistEntry } from 'src/entities/waitlist-entry.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WaitlistEntry]),
    EmailModule,
    BullModule.registerQueue({
      name: 'waitlist-sync',
    }),
  ],
  controllers: [WaitlistController],
  providers: [WaitlistService, WaitListEntryModelAction],
  exports: [WaitListEntryModelAction],
})
export class WaitlistModule {}
