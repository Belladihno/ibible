// src/meditation/dto/update-preferences.dto.ts
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMeditationPreferencesDto {
  @ApiPropertyOptional({
    example: '06:00:00',
    description: 'Morning meditation time (HH:mm:ss)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'Morning time must be in HH:mm:ss format',
  })
  morningTime?: string;

  @ApiPropertyOptional({
    example: '20:00:00',
    description: 'Evening meditation time (HH:mm:ss)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'Evening time must be in HH:mm:ss format',
  })
  eveningTime?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  morningEnabled?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  eveningEnabled?: boolean;

  @ApiPropertyOptional({ example: 15, description: 'Duration in minutes' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(60)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 'daily' })
  @IsOptional()
  @IsString()
  frequency?: string;
}
