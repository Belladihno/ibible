import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchConversationsDto {
  @ApiPropertyOptional({
    description:
      'Search query for conversation titles (partial match, case-insensitive)',
    example: 'faith',
  })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination (default: 1)',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of results per page (default: 20, max: 100)',
    example: 20,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

import { ValidateIf, IsDefined } from 'class-validator';

export class AdvancedSearchConversationsDto extends SearchConversationsDto {
  @ApiPropertyOptional({
    description: 'Filter by start date (ISO string)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by end date (ISO string)',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter conversations that have scripture references',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  hasReferences?: boolean;

  // Add validation to ensure at least one search criteria
  @ValidateIf(
    (o) =>
      !o.query && !o.startDate && !o.endDate && o.hasReferences === undefined,
  )
  @IsDefined({ message: 'At least one search criteria must be provided' })
  requireAtLeastOne?: never;
}
