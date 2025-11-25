import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ChatMessageDocument = ChatMessage & Document;

export enum MessageSender {
  USER = 'user',
  AI = 'ai',
}

@Schema({ timestamps: true })
export class ChatMessage {
  @ApiProperty({
    description: 'The sender of the message',
    enum: MessageSender,
    example: 'user',
  })
  @Prop({ required: true, enum: MessageSender })
  sender: MessageSender;

  @ApiProperty({
    description: 'Content of the message',
    example: 'Hello, how can I pray for you today?',
  })
  @Prop({ required: true })
  content: string;

  @ApiProperty({
    description: 'Timestamp when the message was sent',
    example: '2023-01-01T10:00:00.000Z',
  })
  @Prop({ default: Date.now })
  timestamp: Date;

  @ApiProperty({
    description: 'References to Bible verses or other resources',
    example: ['Philippians 4:6'],
  })
  @Prop({ type: [String], default: [] })
  references: string[];
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
