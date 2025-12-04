import { ApiProperty } from '@nestjs/swagger';
import { ExperienceRating } from './general-feedback.dto';

export class GeneralFeedbackResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['general'] })
  type: 'general';

  @ApiProperty({ required: false, nullable: true })
  userId?: string | null;

  @ApiProperty({ enum: ExperienceRating, required: false, nullable: true })
  experience?: ExperienceRating | null;

  @ApiProperty({ required: false, nullable: true })
  feedbackText?: string | null;
}
