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

  @ApiPropertyOptional({
    example: 3,
    description: 'Intensity of the emotion (1-5)',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  intensity?: number;

  @ApiPropertyOptional({
    example: 'Feeling anxious about upcoming presentation',
    description: 'Context or additional details about the emotion',
  })
  @IsString()
  @IsOptional()
  context?: string;

  @ApiPropertyOptional({
    example: ['work', 'presentation'],
    description: 'Tags related to the emotion',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
