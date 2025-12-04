import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeedbackService } from './feedback.service';
import { Feedback } from '../../entities/feedback.entity';
import {
  GeneralFeedbackDto,
  ExperienceRating,
} from './dto/general-feedback.dto';
import { ReportIssueDto, IssueType } from './dto/report-issue.dto';

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
};

describe('FeedbackService', () => {
  let service: FeedbackService;
  let repo: typeof mockRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        {
          provide: getRepositoryToken(Feedback),
          useValue: mockRepo,
        },
      ],
    }).compile();
    service = module.get(FeedbackService);
    repo = module.get(getRepositoryToken(Feedback));
    jest.clearAllMocks();
  });

  describe('createGeneralFeedback', () => {
    it('should save general feedback with userId', async () => {
      const dto: GeneralFeedbackDto = {
        experience: ExperienceRating.GOOD,
        feedbackText: 'Great app!',
      };
      const feedback = {
        ...dto,
        type: 'general',
        userId: 'user-123',
        id: 'id-1',
        createdAt: new Date(),
      };
      repo.save.mockResolvedValue(feedback);
      const result = await service.createGeneralFeedback(dto, 'user-123');
      expect(result).toMatchObject({
        id: 'id-1',
        type: 'general',
        userId: 'user-123',
        experience: ExperienceRating.GOOD,
        feedbackText: 'Great app!',
      });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'general',
          userId: 'user-123',
          experience: ExperienceRating.GOOD,
          feedbackText: 'Great app!',
        }),
      );
    });

    it('should save general feedback with null userId', async () => {
      const dto: GeneralFeedbackDto = {
        experience: ExperienceRating.BAD,
        feedbackText: 'Not working',
      };
      const feedback = {
        ...dto,
        type: 'general',
        userId: null,
        id: 'id-2',
        createdAt: new Date(),
      };
      repo.save.mockResolvedValue(feedback);
      const result = await service.createGeneralFeedback(dto, null);
      expect(result.userId).toBeNull();
      expect(result.experience).toBe(ExperienceRating.BAD);
      expect(result.feedbackText).toBe('Not working');
    });
  });

  describe('createReportIssue', () => {
    it('should save issue feedback with imageUrls', async () => {
      const dto: ReportIssueDto = {
        issueType: IssueType.AUDIO_NOT_PLAYING,
        issueDescription: 'Audio fails on chapter 2',
        imageUrls: ['https://img.com/1.png', 'https://img.com/2.png'],
      };
      const feedback = {
        ...dto,
        type: 'issue',
        userId: 'user-456',
        id: 'id-3',
        createdAt: new Date(),
      };
      repo.save.mockResolvedValue(feedback);
      const result = await service.createReportIssue(dto, 'user-456');
      expect(result).toMatchObject({
        id: 'id-3',
        type: 'issue',
        userId: 'user-456',
        issueType: IssueType.AUDIO_NOT_PLAYING,
        issueDescription: 'Audio fails on chapter 2',
        imageUrls: ['https://img.com/1.png', 'https://img.com/2.png'],
      });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'issue',
          userId: 'user-456',
          issueType: IssueType.AUDIO_NOT_PLAYING,
          issueDescription: 'Audio fails on chapter 2',
          imageUrls: ['https://img.com/1.png', 'https://img.com/2.png'],
        }),
      );
    });

    it('should save issue feedback with null imageUrls', async () => {
      const dto: ReportIssueDto = {
        issueType: IssueType.OTHERS,
        issueDescription: 'Something else',
      };
      const feedback = {
        ...dto,
        type: 'issue',
        userId: null,
        id: 'id-4',
        createdAt: new Date(),
        imageUrls: null,
      };
      repo.save.mockResolvedValue(feedback);
      const result = await service.createReportIssue(dto, null);
      expect(result.userId).toBeNull();
      expect(result.issueType).toBe(IssueType.OTHERS);
      expect(result.issueDescription).toBe('Something else');
      expect(result.imageUrls).toBeNull();
    });
  });
});
