import { User } from 'src/entities/user.entity';
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('password_reset_tokens')
export class PasswordResetToken extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ unique: true })
  @Index('idx_password_reset_tokens_token')
  token: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ name: 'is_used', default: false })
  isUsed: boolean;
}
