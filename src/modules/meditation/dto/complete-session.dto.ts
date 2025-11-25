// src/meditation/dto/complete-session.dto.ts
import { IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteSessionDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the session to complete',
  })
  @IsUUID()
  sessionId: string;

  @ApiPropertyOptional({
    example: { reflection: 'Felt peaceful', mood: 'calm' },
    description: 'Optional notes about the session',
  })
  @IsOptional()
  @IsObject()
  notes?: Record<string, any>;
}
