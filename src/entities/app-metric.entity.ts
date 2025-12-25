import { Entity, Column, Index, Unique, Check } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum Platform {
  IOS = 'ios',
  ANDROID = 'android',
}

@Entity('app_metrics')
@Unique(['date', 'platform'])
export class AppMetric extends BaseEntity {
  @Column({ type: 'date' })
  @Index()
  date: string;

  @Column({
    type: 'enum',
    enum: Platform,
  })
  platform: Platform;

  @Column({ type: 'integer', default: 0 })
  @Check(`"downloads" >= 0`)
  downloads: number;

  @Column({ type: 'integer', default: 0 })
  @Check(`"uninstalls" >= 0`)
  uninstalls: number;

  @Column({ type: 'integer', default: 0 })
  @Check(`"activeDevices" >= 0`)
  activeDevices: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  revenue: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;
}
