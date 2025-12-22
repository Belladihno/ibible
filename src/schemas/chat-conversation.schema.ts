import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ChatMessage, ChatMessageSchema } from './chat-message.schema';
import { ApiProperty } from '@nestjs/swagger';

export type ChatConversationDocument = ChatConversation & Document;

@Schema({ timestamps: true })
export class ChatConversation {
  @ApiProperty({
    description: 'ID of the user who owns this conversation',
    example: 'user-uuid-string',
  })
  @Prop({ required: true })
  userId: string;

  @ApiProperty({
    description: 'Title of the conversation',
    example: 'Anxiety and Prayer',
  })
  @Prop({ default: 'New Conversation' })
  title: string;

  @ApiProperty({
    description: 'List of messages in the conversation',
    type: [ChatMessage],
  })
  @Prop({ type: [ChatMessageSchema], default: [] })
  messages: Types.DocumentArray<ChatMessage>;

  @ApiProperty({
    description: 'Whether the conversation is active',
    example: true,
  })
  @Prop({ default: true })
  isActive: boolean;

  @ApiProperty({
    description:
      'Short summary of recent messages to maintain conversation context',
    example: 'User: Hello! Rea: Hi, how can I help you today?',
  })
  @Prop({ type: String, default: '' })
  contextSummary?: string; // new field
}

export const ChatConversationSchema =
  SchemaFactory.createForClass(ChatConversation);
