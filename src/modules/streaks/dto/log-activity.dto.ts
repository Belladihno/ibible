// src/streaks/dto/log-activity.dto.ts
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LogActivityDto {
  @ApiProperty({
    example: 'bible_read',
    description: 'Type of activity',
    enum: [
      'app_open',
      'bible_read',
      'chat',
      'meditation',
      'prayer',
      'verse_save',
    ],
  })
  @IsString()
  activityType: string;

  @ApiPropertyOptional({ example: 'John 3:16' })
  @IsOptional()
  @IsString()
  reference?: string;
}
