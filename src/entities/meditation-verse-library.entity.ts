// src/meditation/entities/meditation-verse-library.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('meditation_verse_library')
export class MeditationVerseLibrary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  reference: string; // e.g., "Psalm 46:10"

  @Column({ type: 'text', nullable: true })
  text: string; // Fetched from API

  @Column({ type: 'varchar', nullable: true })
  translation: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Store full verse data

  @Column({ default: 0 })
  timesUsed: number; // Track usage for rotation

  @Column({ type: 'timestamp', nullable: true })
  lastUsed: Date;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
