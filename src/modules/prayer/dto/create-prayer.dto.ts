import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PrayerType } from 'src/entities/prayer.entity';

export class CreatePrayerDto {
  @ApiProperty({
    example: 'self',
    description: 'Type of prayer - personal or for others',
    enum: PrayerType,
    enumName: 'PrayerType',
  })
  @IsEnum(PrayerType)
  type: PrayerType;

  @ApiProperty({
    example:
      'Please pray for my healing from sickness and for strength during this difficult time.',
    description: 'Original prayer request from the user',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  originalRequest: string;
}
