import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsArray,
} from 'class-validator';

export class LogEmotionDto {
  @ApiProperty({
    example: 'anxious',
    description: 'The emotion being logged',
    enum: [
      'happy',
      'sad',
      'anxious',
      'grateful',
      'angry',
      'peaceful',
      'worried',
      'hopeful',
      'stressed',
      'joyful',
    ],
  })
  @IsString()
  @IsNotEmpty()
  emotion: string;
}
