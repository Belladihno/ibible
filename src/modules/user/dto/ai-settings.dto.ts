import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserTone } from '../enums/user.enums';

export class AiSettingsDto {
  @ApiPropertyOptional({
    enum: UserTone,
    description: 'Preferred AI response tone',
    example: UserTone.FRIENDLY,
  })
  @IsEnum(UserTone)
  @IsOptional()
  tone?: UserTone;
}
