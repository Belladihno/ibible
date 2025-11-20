import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { AuthProvider } from '../enums/user.enums';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongpassword123', description: 'User password' })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    description: 'URL of the user profile picture',
  })
  @IsOptional()
  @IsString()
  profilePicture?: string | null;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number of the user',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string | null;

  @ApiProperty({
    example: 'google',
    description: 'Authentication provider (e.g., google, apple)',
  })
  @IsOptional()
  @IsString()
  authProvider?: AuthProvider;
}
