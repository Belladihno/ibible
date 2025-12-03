// modules/memories/dto/create-memory.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsIn,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FollowUpDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  reminderDeltaDays?: number;
}

export class CreateMemoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  verseRefs?: string[];

  @ApiProperty({ required: false, enum: ['private', 'public', 'shared'] })
  @IsOptional()
  @IsIn(['private', 'public', 'shared'])
  visibility?: 'private' | 'public' | 'shared';

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => FollowUpDto)
  followUp?: FollowUpDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  skipAI?: boolean;
}
