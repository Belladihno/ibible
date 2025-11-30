import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AiSettingsDto } from './ai-settings.dto';

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
}
