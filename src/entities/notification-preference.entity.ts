import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('notification_preferences')
export class NotificationPreference extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'boolean', default: true })
  pushEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  emailEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  meditationReminders: boolean;

  @Column({ type: 'boolean', default: true })
  memoryReminders: boolean;

  @Column({ type: 'boolean', default: true })
  reaCheckins: boolean;

  @Column({ type: 'boolean', default: true })
  streakMilestones: boolean;

  @Column({ type: 'boolean', default: false })
  discoverVerses: boolean;

  // Quiet hours (24-hour format, e.g., "22:00")
  @Column({ type: 'varchar', length: 5, nullable: true })
  quietHoursStart: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  quietHoursEnd: string;
}
