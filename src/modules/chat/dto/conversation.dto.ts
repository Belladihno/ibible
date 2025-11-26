import { ApiProperty } from '@nestjs/swagger';
import { MessageSender } from '../../../schemas/chat-message.schema';

export class ChatMessageDto {
  @ApiProperty({ enum: MessageSender })
  sender: MessageSender;

  @ApiProperty()
  content: string;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty({ type: [String] })
  references: string[];
}

export class ConversationDto {
  @ApiProperty()
  id: string; // Changed from _id to id

  @ApiProperty()
  userId: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: [ChatMessageDto] })
  messages: ChatMessageDto[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class GetConversationsResponseDto {
  @ApiProperty({ type: [ConversationDto] })
  conversations: ConversationDto[];
}
