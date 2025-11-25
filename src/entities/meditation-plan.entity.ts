import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { BaseEntity } from './base.entity';

@Entity('meditation_plans')
export class MeditationPlan extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'time', name: 'morning_time', nullable: true })
  morningTime: string; // Format: "HH:mm:ss"

  @Column({ type: 'time', name: 'evening_time', nullable: true })
  eveningTime: string;

  @Column({ name: 'morning_enabled', default: true })
  morningEnabled: boolean;

  @Column({ name: 'evening_enabled', default: false })
  eveningEnabled: boolean;

  @Column({ name: 'duration_minutes', default: 10 })
  durationMinutes: number;

  @Column({ type: 'varchar', length: 50, default: 'daily' })
  frequency: string; // daily, weekly, custom

  @Column({ type: 'jsonb', nullable: true })
  customSchedule: Record<string, any>; // For custom frequency plans

  @Column({ default: true })
  active: boolean;
}
