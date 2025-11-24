import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { BaseEntity } from './base.entity';

@Entity('email_verification_tokens')
// @Index('idx_otp', { synchronize: false })
// @Index('idx_user_id', { synchronize: false })
export class EmailVerificationToken extends BaseEntity {
  @Column()
  @Index('idx_user_id')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  @Index('idx_otp')
  otp: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({
    name: 'verified_at',
    type: 'timestamp',
    nullable: true,
    default: null,
  })
  verifiedAt: Date;
}
