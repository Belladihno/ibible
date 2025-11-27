import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { PrayerReminder } from './prayer-reminder.entity';
import { User } from './user.entity';

export enum PrayerType {
  SELF = 'self',
  OTHERS = 'others'
}

export enum PrayerStatus {
  ONGOING = 'ongoing',
  ANSWERED = 'answered'
}

@Entity('prayers')
export class Prayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PrayerType,
    default: PrayerType.SELF
  })
  type: PrayerType;

  @Column('text')
  originalRequest: string;

  @Column('text', { nullable: true })
  rephrasedRequest: string | null;

  @Column('text', { nullable: true })
  aiPrayer: string | null;

  @Column({
    type: 'enum',
    enum: PrayerStatus,
    default: PrayerStatus.ONGOING
  })
  status: PrayerStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PrayerReminder, reminder => reminder.prayer)
  reminders: PrayerReminder[];

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}