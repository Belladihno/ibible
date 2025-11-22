import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('daily_verses')
export class DailyVerse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date', unique: true })
  @Index()
  date: string;

  @Column()
  reference: string;

  @Column({ type: 'jsonb' })
  verseData: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
