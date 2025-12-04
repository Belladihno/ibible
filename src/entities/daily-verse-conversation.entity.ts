import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { DailyVerseConversationMessage } from './daily-verse-conversation-message.entity';

@Entity({ name: 'daily_verse_conversations' })
export class DailyVerseConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ type: 'varchar', length: 255 })
  verseReference: string;

  @OneToMany(() => DailyVerseConversationMessage, (m) => m.conversation, {
    cascade: true,
    eager: true,
  })
  messages: DailyVerseConversationMessage[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
