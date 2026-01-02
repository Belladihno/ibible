import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('ai_usage_logs')
@Index('idx_ai_usage_user_id', ['userId'])
@Index('idx_ai_usage_model', ['model'])
@Index('idx_ai_usage_created_at', ['createdAt'])
export class AiUsageLog extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  feature: string;

  @Column()
  model: string;

  @Column()
  provider: string;

  @Column({ name: 'input_tokens', type: 'int' })
  inputTokens: number;

  @Column({ name: 'output_tokens', type: 'int' })
  outputTokens: number;

  @Column({ name: 'total_tokens', type: 'int' })
  totalTokens: number;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  cost: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;
}
