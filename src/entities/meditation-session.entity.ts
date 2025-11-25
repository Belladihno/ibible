import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { BaseEntity } from './base.entity';

@Entity('meditation_sessions')
@Index(['userId', 'startedAt'])
@Index(['userId', 'completedAt'])
export class MeditationSession extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;

  @Column({ name: 'duration_seconds', nullable: true })
  durationSeconds: number;

  @Column({
    name: 'verse_reference',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  verseReference: string; // e.g., "John 3:16"

  @Column({ name: 'verse_text', type: 'text', nullable: true })
  verseText: string;

  @Column({ type: 'varchar', length: 20, default: 'morning' })
  sessionType: string; // morning, evening, custom

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'jsonb', nullable: false, default: {} })
notes: Record<string, any> | null;
}
