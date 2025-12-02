import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { InstantlyService } from './services/instantly.service';
import { ApolloService } from './services/apollo.service';
import { WaitlistSyncProcessor } from './processors/waitlist-sync.processor';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'waitlist-sync',
    }),
  ],
  providers: [InstantlyService, ApolloService, WaitlistSyncProcessor],
  exports: [BullModule],
})
export class SalesModule {}
