import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { DailyVerseConversation } from './daily-verse-conversation.entity';

export type MessageSender = 'user' | 'assistant';

@Entity({ name: 'daily_verse_conversation_messages' })
export class DailyVerseConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DailyVerseConversation, (c) => c.messages, {
    onDelete: 'CASCADE',
  })
  conversation: DailyVerseConversation;

  @Column({ type: 'varchar', length: 16 })
  sender: MessageSender;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
