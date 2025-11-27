import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePrayerDto } from './create-prayer.dto';
import { PrayerStatus } from 'src/entities/prayer.entity';

export class UpdatePrayerDto extends PartialType(CreatePrayerDto) {
  @ApiPropertyOptional({
    example: 'answered',
    description: 'Status of the prayer request',
    enum: PrayerStatus,
    enumName: 'PrayerStatus'
  })
  @IsEnum(PrayerStatus)
  @IsOptional()
  status?: PrayerStatus;

  @ApiPropertyOptional({
    example: 'Heavenly Father, I come before You seeking Your healing touch...',
    description: 'AI-generated prayer text'
  })
  @IsString()
  @IsOptional()
  aiPrayer?: string;
}