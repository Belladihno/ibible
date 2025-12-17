import { Entity, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('early_access_entries')
export class EarlyAccessEntry extends BaseEntity {
  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ unique: true })
  email: string;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail() {
    if (this.email) {
      this.email = this.email.toLowerCase();
    }
  }
}
