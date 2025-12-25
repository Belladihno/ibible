import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PrayerType } from './prayer.entity';

@Entity('temp_prayers')
export class TempPrayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PrayerType, default: PrayerType.SELF })
  type: PrayerType;

  @Column('text')
  originalRequest: string;

  @Column('text', { nullable: true })
  rephrasedRequest: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
