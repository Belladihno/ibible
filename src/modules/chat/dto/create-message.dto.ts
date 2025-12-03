import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    description: 'The message content',
    example: 'Hello, can you help me understand Revelation 3:21',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description:
      'Optional. Leave empty to start a NEW conversation. Provide an existing conversation ID to CONTINUE that conversation.',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsString()
  @IsOptional()
  conversationId?: string;
}
