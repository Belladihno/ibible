import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNotEmpty } from 'class-validator';

export enum IssueType {
  INACCURATE_CROSS_REFERENCE = 'Inaccurate cross-reference',
  AUDIO_NOT_PLAYING = 'Audio not playing',
  HIGHLIGHT_NOT_SAVING = 'Highlight not saving',
  BOOKMARK_NOT_SAVING = 'Bookmark not saving',
  TRANSLATION = 'Translation',
  OTHERS = 'Others',
}

export class ReportIssueDto {
  @ApiProperty({ enum: IssueType, description: 'What went wrong' })
  @IsEnum(IssueType)
  issueType: IssueType;

  @ApiProperty({ description: 'Describe your issue' })
  @IsString()
  @IsNotEmpty()
  issueDescription: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string' },
    description: 'Array of image URLs (if any) previously uploaded',
  })
  @IsOptional()
  imageUrls?: string[];
}
