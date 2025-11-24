import { Entity, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('waitlist_entries')
export class WaitlistEntry extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail() {
    if (this.email) {
      this.email = this.email.toLowerCase();
    }
  }
}
