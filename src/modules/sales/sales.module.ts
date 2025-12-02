import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { QueueName } from '../queue/queue-names.enum';
import { InstantlyService } from './services/instantly.service';
import { ApolloService } from './services/apollo.service';
import { WaitlistSyncProcessor } from './processors/waitlist-sync.processor';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: QueueName.WAITLIST_SYNC,
    }),
  ],
  providers: [InstantlyService, ApolloService, WaitlistSyncProcessor],
  exports: [InstantlyService, ApolloService],
})
export class SalesModule {}
