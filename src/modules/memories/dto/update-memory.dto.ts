// modules/memories/dto/update-memory.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { CreateMemoryDto } from './create-memory.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateMemoryDto extends PartialType(CreateMemoryDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  forceAIReprocess?: boolean;
}
