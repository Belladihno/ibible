// src/meditation/dto/start-session.dto.ts
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StartSessionDto {
  @ApiPropertyOptional({
    example: 'morning',
    enum: ['morning', 'evening', 'custom'],
  })
  @IsOptional()
  @IsString()
  sessionType?: string;

  @ApiPropertyOptional({
    example: 'This verse reminds me to slow down and trust God more.',
    description: 'Optional initial reflection on the verse',
  })
  @IsOptional()
  @IsString()
  initialReflection?: string;
}
