import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token', description: 'Password reset token' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'newStrongPassword123', description: 'New password' })
  @IsString()
  @MinLength(6)
  password: string;
}
