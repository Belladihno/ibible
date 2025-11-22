import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BibleVerseController } from './bible-verse.controller';
import { BibleVerseService } from './bible-verse.service';
import { DailyVerse } from 'src/entities/bible-verse.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DailyVerse])],
  controllers: [BibleVerseController],
  providers: [BibleVerseService],
  exports: [BibleVerseService],
})
export class BibleVerseModule {}
