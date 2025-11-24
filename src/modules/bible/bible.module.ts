import { Module } from '@nestjs/common';
import { BibleController } from './bible.controller';
import { BibleService } from './bible.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReadingLog } from '../../entities/reading-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReadingLog])],
  controllers: [BibleController],
  providers: [BibleService],
})
export class BibleModule {}
