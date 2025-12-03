import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpdatePreferencesDto {
  @IsBoolean()
  @IsOptional()
  pushEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  meditationReminders?: boolean;

  @IsBoolean()
  @IsOptional()
  reaCheckins?: boolean;

  @IsBoolean()
  @IsOptional()
  streakMilestones?: boolean;

  @IsBoolean()
  @IsOptional()
  discoverVerses?: boolean;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'quietHoursStart must be in HH:mm format (24-hour)',
  })
  quietHoursStart?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'quietHoursEnd must be in HH:MM format (e.g., 07:00)',
  })
  quietHoursEnd?: string;
}
