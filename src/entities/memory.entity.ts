import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum MemoryVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
  SHARED = 'shared',
}

@Entity('memories')
@Index(['userId'])
export class Memory extends BaseEntity {
  @Column()
  userId: string;

  @Column()
  title: string;

  @Column('text')
  body: string;

  @Column('text', { array: true, default: [] })
  tags: string[];

  @Column('text', { array: true, default: [] })
  verseRefs: string[];

  @Column({
    type: 'enum',
    enum: MemoryVisibility,
    default: MemoryVisibility.PRIVATE,
  })
  visibility: MemoryVisibility;

  @Column({ type: 'jsonb', nullable: true })
  followUp?: {
    scheduledAt?: Date;
    reminderDeltaDays?: number;
    isCompleted?: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  aiRephrase?: {
    text?: string;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    jobId?: string;
    processedAt?: Date;
    error?: string;
    source?: string;
  };

  @Column({ default: false })
  skipAI: boolean;
}
