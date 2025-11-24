import { User } from './user.entity';
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ unique: true })
  @Index('idx_refresh_tokens_token')
  token: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ name: 'revoked', default: false })
  revoked: boolean;
}
