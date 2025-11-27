import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TempPrayerType {
  SELF = 'self',
  OTHERS = 'others',
}

@Entity('temp_prayers')
export class TempPrayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TempPrayerType, default: TempPrayerType.SELF })
  type: TempPrayerType;

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
