import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  Matches,
  IsBoolean,
  IsISO8601,
} from 'class-validator';
import { ReminderType } from 'src/entities/prayer-reminder.entity';

export class UpdateReminderDto {
  @IsOptional()
  @IsEnum(ReminderType)
  @ApiPropertyOptional({ example: 'custom', enum: ReminderType })
  type?: ReminderType;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'customTime must be in HH:MM 24-hour format',
  })
  @ApiPropertyOptional({
    example: '11:00',
    description: 'Custom time in HH:MM 24-hour format',
  })
  customTime?: string;

  @IsOptional()
  @IsISO8601()
  @ApiPropertyOptional({
    example: '2025-11-27',
    description: 'Custom start date (ISO yyyy-mm-dd)',
  })
  customStartDate?: string;

  @IsOptional()
  @IsISO8601()
  @ApiPropertyOptional({
    example: '2025-12-27',
    description: 'Custom end date (ISO yyyy-mm-dd)',
  })
  customEndDate?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: true })
  isActive?: boolean;
}
