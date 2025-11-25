import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    description: 'The message content',
    example: 'Hello, can you help me understand Philippians 4:6?',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
