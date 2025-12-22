import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { ActivityType } from 'src/modules/user/enums/user.enums';

@Entity('user_activities')
export class UserActivity extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  eventType: ActivityType;

  @Column({ name: 'feature_name', nullable: true })
  featureName: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ type: 'integer', nullable: true })
  duration: number; // in seconds
}
