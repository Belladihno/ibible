import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  IsBoolean,
  IsISO8601,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderType } from 'src/entities/prayer-reminder.entity';

export class CreateReminderDto {
  @ApiProperty({ example: 'uuid', description: 'Prayer id' })
  @IsUUID()
  prayerId!: string;

  @ApiProperty({ example: 'morning', enum: ReminderType })
  @IsEnum(ReminderType)
  type?: ReminderType;

  @ApiPropertyOptional({
    example: '08:30',
    description: 'Custom time in HH:MM format (required when type is custom)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'customTime must be in HH:MM 24-hour format',
  })
  customTime?: string;

  @ApiPropertyOptional({
    example: '2025-11-27',
    description:
      'Custom reminder start date (ISO yyyy-mm-dd) required when type is custom',
  })
  @IsOptional()
  @IsISO8601()
  customStartDate?: string;

  @ApiPropertyOptional({
    example: '2025-12-27',
    description:
      'Custom reminder end date (ISO yyyy-mm-dd) required when type is custom',
  })
  @IsOptional()
  @IsISO8601()
  customEndDate?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the reminder is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
