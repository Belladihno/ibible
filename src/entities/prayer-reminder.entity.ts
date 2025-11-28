import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Prayer } from './prayer.entity';

export enum ReminderType {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
  CUSTOM = 'custom',
}

@Entity('prayer_reminders')
export class PrayerReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ReminderType,
  })
  type: ReminderType;

  @Column({ type: 'time', nullable: true })
  customTime: string | null;

  @Column({ type: 'date', nullable: true })
  customStartDate: Date | null;

  @Column({ type: 'date', nullable: true })
  customEndDate: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Prayer, (prayer) => prayer.reminders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'prayerId' })
  prayer: Prayer;

  @Column()
  prayerId: string;
}
