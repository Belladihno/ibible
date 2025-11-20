import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty({
    description: 'JWT access token',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Token type',
    default: 'Bearer',
  })
  tokenType: string;
}
