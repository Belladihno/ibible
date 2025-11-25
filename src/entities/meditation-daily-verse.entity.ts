// src/meditation/entities/meditation-daily-verse.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('meditation_daily_verses')
export class MeditationDailyVerse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date', unique: true })
  date: string; // YYYY-MM-DD format

  @Column({ type: 'varchar', length: 100 })
  reference: string; // e.g., "Psalm 46:10"

  @Column({ type: 'text' })
  verseData: string; // JSON stringified BibleVerse object

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
