import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum NotificationType {
  PUSH = 'push',
  EMAIL = 'email',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export enum NoticationCategory {
  WELCOME = 'welcome',
  PASSWORD_REST = 'password_reset',
  VERIFICATION = 'verification',
  WAITLIST_COMFIRMATION = 'waitlist_confirmation',
  MEDITATION_REMINDER = 'meditation_reminder',
  MEMORY_REMINDER = 'memory_reminder',
  STREAK_MILESTONE = 'streak_milestone',
  REA_CHECKIN = 'rea_checkin',
  DISCOVER_VERSE = 'discover_verse',
}

@Entity('notification_logs')
export class NotificationLog extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'enum', enum: NoticationCategory })
  category: NoticationCategory;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  body: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;
}
