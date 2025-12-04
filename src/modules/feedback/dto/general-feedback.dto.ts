import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNotEmpty } from 'class-validator';

export enum ExperienceRating {
  BAD = 'bad',
  AVERAGE = 'average',
  GOOD = 'good',
}

export class GeneralFeedbackDto {
  @ApiProperty({
    enum: ExperienceRating,
    description: 'Rate your experience',
  })
  @IsEnum(ExperienceRating)
  experience: ExperienceRating;

  @ApiProperty({ description: 'Your feedback' })
  @IsString()
  @IsNotEmpty()
  feedbackText: string;
}
