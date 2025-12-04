import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UserPrefrencesDto {
  @ApiPropertyOptional({
    description: 'preferred translation',
    example: 'KJV',
  })
  @IsOptional()
  preferred_translator: string;

  @ApiPropertyOptional({
    description: 'scripture frequemcy',
    example: 'balanced',
  })
  @IsOptional()
  scripture_frequency: string;

  @ApiPropertyOptional({
    description: 'if you need microphone',
    example: 'false',
  })
  @IsOptional()
  microphone: boolean;
}
