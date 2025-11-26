import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendPasswordResetDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email address to resend password reset code',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
