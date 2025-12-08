import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstantlyService } from './services/instantly.service';
import { WaitlistSyncProcessor } from '../queue/processors/waitlist-sync.processor';
import { WaitlistEntry } from 'src/entities/waitlist-entry.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([WaitlistEntry])],
  providers: [InstantlyService, WaitlistSyncProcessor],
  exports: [InstantlyService],
})
export class SalesModule {}
