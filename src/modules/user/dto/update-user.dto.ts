import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AiSettingsDto } from './ai-settings.dto';
import { UserPrefrencesDto } from './user-preferences.dto';

// Remove 'password' and 'authProvider' from updatable fields
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'authProvider'] as const),
) {
  @ApiPropertyOptional({
    description: 'AI settings for personalized responses',
    type: AiSettingsDto,
    example: {
      tone: 'friendly',
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiSettingsDto)
  aiSettings?: AiSettingsDto;

  @ApiPropertyOptional({
    description: 'user preferences for bible',
    type: UserPrefrencesDto,
    example: {
      preferred_translator: 'KJV',
      scripture_frequency: 'balanced',
      microphone: 'false',
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserPrefrencesDto)
  user_preferences?: UserPrefrencesDto;
}
