import { Entity, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('waitlist_entries')
export class WaitlistEntry extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'timestamptz', nullable: true })
  salesSyncedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  syncAttemptedAt?: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail() {
    if (this.email) {
      this.email = this.email.toLowerCase();
    }
  }
}
