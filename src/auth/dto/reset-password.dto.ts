import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'newstrongpassword123',
    description: 'New password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
