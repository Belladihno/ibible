import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('bible_version')
export class BibleVersion {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;
  @Column({ type: 'varchar', length: 255 })
  name: string;
  @Column({ type: 'varchar', length: 50, nullable: true })
  abbreviation: string;
  @CreateDateColumn()
  @Column({ type: 'varchar', length: 10 })
  languageCode: string;
  @Column({ type: 'varchar', length: 100 })
  languageName: string;
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
}
