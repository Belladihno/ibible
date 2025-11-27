import {
  IsEnum,
  IsOptional,
  IsBoolean,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderType } from 'src/entities/prayer-reminder.entity';

export class CreateReminderDto {
  @ApiProperty({
    example: 'morning',
    description: 'Type of reminder time slot',
    enum: ReminderType,
    enumName: 'ReminderType',
  })
  @IsEnum(ReminderType)
  type: ReminderType;

  @ApiPropertyOptional({
    example: '08:30',
    description: 'Custom time in HH:MM format (required when type is custom)',
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  @IsOptional()
  customTime?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the reminder is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
