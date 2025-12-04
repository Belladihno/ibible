import {
  Controller,
  Post,
  Body,
  Req,
  Optional,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { GeneralFeedbackDto } from './dto/general-feedback.dto';
import { ReportIssueDto } from './dto/report-issue.dto';
// files are not uploaded directly; `imageUrls` are sent in JSON
import { GeneralFeedbackResponseDto } from './dto/general-feedback.response.dto';
import { ReportIssueResponseDto } from './dto/report-issue.response.dto';
import { AuthGuard } from 'src/guards/auth.guard';

@ApiTags('Feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('general')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Submit general feedback' })
  @ApiBody({ type: GeneralFeedbackDto })
  @ApiCreatedResponse({ type: GeneralFeedbackResponseDto })
  async createGeneralFeedback(
    @Body() dto: GeneralFeedbackDto,
    @Req() req: any,
  ) {
    const user = req.user;
    const userId = user?.userId || user?.id || user?.sub || null;
    return this.feedbackService.createGeneralFeedback(dto, userId);
  }

  @Post('issue')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Report an issue' })
  @ApiBody({ type: ReportIssueDto })
  @ApiCreatedResponse({ type: ReportIssueResponseDto })
  async reportIssue(@Body() dto: ReportIssueDto, @Req() req: any) {
    const user = req.user;
    const userId = user?.userId || user?.id || user?.sub || null;
    return this.feedbackService.createReportIssue(dto, userId);
  }
}
