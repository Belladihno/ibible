// src/streaks/entities/streak-activity.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('streak_activities')
export class StreakActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'activity_type' })
  activityType: string;

  @Column({ name: 'activity_date', type: 'date' })
  activityDate: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
