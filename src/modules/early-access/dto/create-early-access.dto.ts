import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEarlyAccessDto {
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

  @ApiProperty({
    example: 'John Doe',
    description: 'User name',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Name cannot be empty' })
  name: string;
}
