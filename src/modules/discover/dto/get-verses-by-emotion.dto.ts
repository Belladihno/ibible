import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';

export class GetVersesByEmotionDto {
  @ApiProperty({
    example: 'anxious',
    description: 'The emotion to get verses for',
  })
  @IsString()
  @IsNotEmpty()
  emotion: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Number of verses to return',
    default: 5,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}
