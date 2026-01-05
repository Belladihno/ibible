import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('bible_packages')
export class BiblePackage extends BaseEntity {
  @Column({
    name: 'code',
    unique: true,
  })
  code: string;

  @Column({
    name: 'name',
  })
  name: string;

  @Column({
    name: 'language',
  })
  language: string;

  @Column({
    name: 'version',
  })
  version: string;

  @Column({
    name: 'format',
  })
  format: string;

  @Column({
    name: 'url',
  })
  url: string;

  @Column({
    name: 'checksum',
    nullable: true,
  })
  checksum?: string;

  @Column({
    name: 'size_mb',
    type: 'float',
    nullable: true,
  })
  sizeMb?: number;

  @Column({
    name: 'is_active',
    default: true,
  })
  isActive: boolean;
}
