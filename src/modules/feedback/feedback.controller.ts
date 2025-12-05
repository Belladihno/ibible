import {
  Controller,
  Post,
  Body,
  Req,
  UploadedFiles,
  UseInterceptors,
  Optional,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiCreatedResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { UploadService } from '../upload/upload.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { GeneralFeedbackDto } from './dto/general-feedback.dto';
import { ReportIssueDto } from './dto/report-issue.dto';
// files are not uploaded directly; `imageUrls` are sent in JSON
import { GeneralFeedbackResponseDto } from './dto/general-feedback.response.dto';
import { ReportIssueResponseDto } from './dto/report-issue.response.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { OptionalAuthGuard } from 'src/guards/optional-auth.guard';

@ApiTags('Feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly uploadService: UploadService,
  ) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    const urls = await Promise.all(
      files.map((file) => this.uploadService.uploadFile(file)),
    );

    return { imageUrls: urls };
  }

  @Post('general')
  @UseGuards(OptionalAuthGuard)
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
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Report an issue' })
  @ApiBody({ type: ReportIssueDto })
  @ApiCreatedResponse({ type: ReportIssueResponseDto })
  async reportIssue(@Body() dto: ReportIssueDto, @Req() req: any) {
    const user = req.user;
    const userId = user?.userId || user?.id || user?.sub || null;
    return this.feedbackService.createReportIssue(dto, userId);
  }
}
