import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { BaseEntity } from './base.entity';

@Entity('user_emotions')
@Index(['userId', 'loggedAt'])
export class UserEmotion extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 50 })
  @Index('idx_user_emotions_emotion')
  emotion: string;

  @Column({
    name: 'logged_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Index('idx_user_emotions_logged_at')
  loggedAt: Date;
}
