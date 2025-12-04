import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../../entities/feedback.entity';
import { GeneralFeedbackResponseDto } from './dto/general-feedback.response.dto';
import { ReportIssueResponseDto } from './dto/report-issue.response.dto';
import { GeneralFeedbackDto } from './dto/general-feedback.dto';
import { ReportIssueDto } from './dto/report-issue.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepo: Repository<Feedback>,
  ) {}

  async createGeneralFeedback(dto: GeneralFeedbackDto, userId: string | null) {
    const feedback = new Feedback();
    feedback.type = 'general';
    feedback.userId = userId ?? null;
    feedback.experience = dto.experience ?? null;
    feedback.feedbackText = dto.feedbackText ?? null;
    const saved = await this.feedbackRepo.save(feedback);
    const res: GeneralFeedbackResponseDto = {
      id: saved.id,
      type: 'general',
      userId: saved.userId ?? null,
      experience: (saved.experience as any) ?? null,
      feedbackText: saved.feedbackText ?? null,
    };
    return res;
  }

  async createReportIssue(dto: ReportIssueDto, userId: string | null) {
    const imageUrls = dto.imageUrls ?? null;
    const feedback = new Feedback();
    feedback.type = 'issue';
    feedback.userId = userId ?? null;
    feedback.issueType = dto.issueType ?? null;
    feedback.issueDescription = dto.issueDescription ?? null;
    feedback.imageUrls = imageUrls;
    const saved = await this.feedbackRepo.save(feedback);
    const res: ReportIssueResponseDto = {
      id: saved.id,
      type: 'issue',
      userId: saved.userId ?? null,
      issueType: (saved.issueType as any) ?? null,
      issueDescription: saved.issueDescription ?? null,
      imageUrls: saved.imageUrls ?? null,
    };
    return res;
  }
}
