import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstantlyService } from './services/instantly.service';
import { ApolloService } from './services/apollo.service';
import { WaitlistSyncProcessor } from './processors/waitlist-sync.processor';
import { WaitlistEntry } from 'src/entities/waitlist-entry.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([WaitlistEntry])],
  providers: [InstantlyService, ApolloService, WaitlistSyncProcessor],
  exports: [InstantlyService, ApolloService],
})
export class SalesModule {}
