import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BibleVerseController } from './daily-verse.controller';
import { BibleVerseService } from './daily-verse.service';
import { DailyVerse } from 'src/entities/bible-verse.entity';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [TypeOrmModule.forFeature([DailyVerse]), HttpModule],
  controllers: [BibleVerseController],
  providers: [BibleVerseService],
  exports: [BibleVerseService],
})
export class BibleVerseModule {}
