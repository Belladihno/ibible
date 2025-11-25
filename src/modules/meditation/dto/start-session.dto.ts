// src/meditation/dto/start-session.dto.ts
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StartSessionDto {
  @ApiPropertyOptional({
    example: 'morning',
    enum: ['morning', 'evening', 'custom'],
    description: 'Type of meditation session',
  })
  @IsOptional()
  @IsString()
  sessionType?: string;
}
