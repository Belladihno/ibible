import { ApiProperty } from '@nestjs/swagger';
import { IssueType } from './report-issue.dto';

export class ReportIssueResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['issue'] })
  type: 'issue';

  @ApiProperty({ required: false, nullable: true })
  userId?: string | null;

  @ApiProperty({ enum: IssueType, required: false, nullable: true })
  issueType?: IssueType | null;

  @ApiProperty({ required: false, nullable: true })
  issueDescription?: string | null;

  @ApiProperty({
    type: 'array',
    items: { type: 'string' },
    required: false,
    nullable: true,
  })
  imageUrls?: string[] | null;
}
