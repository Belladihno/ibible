// src/meditation/dto/send-chat-message.dto.ts
import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendChatMessageDto {
  @ApiProperty({
    example: 'I struggle with being still. My mind is always racing.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;
}
