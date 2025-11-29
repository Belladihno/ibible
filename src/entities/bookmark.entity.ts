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

  @Column({ name: 'text' })
  text: string;

  @Column({ name: 'verse' })
  verse: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
