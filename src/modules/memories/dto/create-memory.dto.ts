import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FollowUpDto {
  @ApiProperty({
    required: false,
    description: 'ISO date string for scheduledAt',
    example: '2025-12-01T09:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ required: false, description: 'Days until reminder' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  reminderDeltaDays?: number;
}

export class CreateMemoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'First miracle of the month' })
  title: string;

  @ApiProperty({ example: 'Answered prayer for a new job' })
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ required: false, type: [String], example: ['prayer', 'job'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ required: false, type: [String], example: ['John 3:16'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  verseRefs?: string[];

  @ApiProperty({ required: false, example: 'private' })
  @IsOptional()
  @IsIn(['private', 'public'])
  visibility?: 'private' | 'public';

  @ApiProperty({
    required: false,
    type: FollowUpDto,
    example: { scheduledAt: '2025-12-01T09:00:00.000Z', reminderDeltaDays: 30 },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FollowUpDto)
  followUp?: FollowUpDto;
}
