import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ALERT, UserTone, Voice } from '../enums/user.enums';

export class AiSettingsDto {
  @ApiPropertyOptional({
    enum: UserTone,
    description: 'Preferred AI response tone',
    example: UserTone.FRIENDLY,
  })
  @IsEnum(UserTone)
  @IsOptional()
  tone?: UserTone;

  @IsEnum(Voice)
  @IsOptional()
  voice: Voice;

  @IsEnum(ALERT)
  @IsOptional()
  alerts: ALERT;

  @IsOptional()
  follow_up: boolean;
}
