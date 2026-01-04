import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ChatMessage } from './chat-message.entity';

@Entity('chat_conversations')
@Index(['userId']) // Index for searching by user
export class ChatConversation extends BaseEntity {
  @Column()
  userId: string;

  @Column({ default: 'New Conversation' })
  title: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  contextSummary?: string;

  @OneToMany(() => ChatMessage, (message) => message.conversation, {
    cascade: true,
  })
  messages: ChatMessage[];
}
