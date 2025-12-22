import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EarlyAccessService } from './early-access.service';
import { EarlyAccessController } from './early-access.controller';
import { EarlyAccessEntryModelAction } from 'src/actions/model-actions';
import { EarlyAccessEntry } from 'src/entities/early-access-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EarlyAccessEntry])],
  controllers: [EarlyAccessController],
  providers: [EarlyAccessService, EarlyAccessEntryModelAction],
  exports: [EarlyAccessEntryModelAction],
})
export class EarlyAccessModule {}
