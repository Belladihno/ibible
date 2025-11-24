import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('reading_log')
export class ReadingLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true, default: 'de4e12af7f28f599-02' })
  bibleId?: string;

  @Column({ nullable: true })
  book?: string;

  @Column({ nullable: true })
  chapter?: string;

  @Column({ nullable: true })
  verse?: string;

  @Column({ nullable: true })
  version?: string;

  @Column({ nullable: true })
  timestamp?: string;

  @CreateDateColumn()
  createdAt: Date;
}
