import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWaitlistEntryDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: 'Email must be a valid format (e.g., user@example.com)',
  })
  email: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'User name (optional)',
  })
  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'Name cannot be empty if provided' })
  name?: string;
}
