import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email address to resend verification code',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
