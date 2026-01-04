import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ChatConversation } from './chat-conversation.entity';
import { MessageSender } from '../shared/enums';

@Entity('chat_messages')
export class ChatMessage extends BaseEntity {
  @Column({
    type: 'enum',
    enum: MessageSender,
  })
  sender: MessageSender;

  @Column('text')
  content: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column('text', { array: true, default: [] })
  references: string[];

  @Column()
  conversationId: string;

  @ManyToOne(() => ChatConversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: ChatConversation;
}
