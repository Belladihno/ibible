import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('daily_verses')
export class DailyVerse extends BaseEntity {
  @Column({ type: 'date', unique: true })
  @Index()
  date: string;

  @Column()
  reference: string;

  @Column({ type: 'jsonb' })
  verseData: string;
}
