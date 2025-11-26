import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('bookmarks')
export class BookMarks {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'book' })
  book: string;

  @Column({ name: 'chapter' })
  chapter: number;

  @Column({ name: 'verse' })
  verse: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
