import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistService } from './waitlist.service';
import { WaitListEntryModelAction } from 'src/actions/model-actions';
import { EmailService } from 'src/modules/email/email.service';
import { QueueName } from '../queue/queue-names.enum';
import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('WaitlistService', () => {
  let service: WaitlistService;
  let mockQueue: any;
  let mockModelAction: any;
  let mockEmailService: any;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn(),
      getWaitingCount: jest.fn(),
      getActiveCount: jest.fn(),
      getCompletedCount: jest.fn(),
      getFailedCount: jest.fn(),
      getDelayedCount: jest.fn(),
      isPaused: jest.fn(),
      clean: jest.fn(),
    };

    mockModelAction = {
      create: jest.fn(),
      list: jest.fn(),
    };

    mockEmailService = {
      sendMail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistService,
        { provide: WaitListEntryModelAction, useValue: mockModelAction },
        { provide: EmailService, useValue: mockEmailService },
        {
          provide: `BullQueue_${QueueName.WAITLIST_SYNC}`,
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<WaitlistService>(WaitlistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ----------------------------------------
  // Test: create()
  // ----------------------------------------
  it('should create entry, send email, and queue job', async () => {
    const entry = { id: 'entry-1', email: 'jane@example.com', name: 'Jane Doe' };
    mockModelAction.create.mockResolvedValue(entry);
    mockQueue.add.mockResolvedValue({ id: 'job-1' });

    const res = await service.create({ email: entry.email, name: entry.name });

    expect(mockModelAction.create).toHaveBeenCalledWith({
      createPayload: entry,
      transactionOptions: { useTransaction: false },
    });
    expect(mockEmailService.sendMail).toHaveBeenCalled();
    expect(mockQueue.add).toHaveBeenCalledWith(
      'sync-to-sales-tools',
      { id: entry.id, email: entry.email, name: entry.name },
      expect.any(Object),
    );
    expect(res).toEqual({
      message: 'Success! User added to the waitlist.',
      email: entry.email,
      name: entry.name,
    });
  });

  it('should succeed even if queue.add fails', async () => {
    const entry = { email: 'jane@example.com', name: 'Jane Doe' };
    mockModelAction.create.mockResolvedValue(entry);
    mockQueue.add.mockRejectedValue(new Error('Queue down'));

    const res = await service.create({ email: entry.email, name: entry.name });

    expect(mockQueue.add).toHaveBeenCalled();
    expect(res).toEqual({
      message: 'Success! User added to the waitlist.',
      email: entry.email,
      name: entry.name,
    });
  });

  it('should throw ConflictException for duplicate email', async () => {
    mockModelAction.create.mockRejectedValue({ code: '23505' });

    await expect(
      service.create({ email: 'exists@example.com', name: 'Jane' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw InternalServerErrorException for other DB errors', async () => {
    mockModelAction.create.mockRejectedValue(new Error('DB fail'));

    await expect(
      service.create({ email: 'fail@example.com', name: 'Jane' }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  // ----------------------------------------
  // Test: findAll()
  // ----------------------------------------
  it('should return paginated results', async () => {
    const payload = [{ email: 'a@example.com', name: 'A' }];
    const paginationMeta = { page: 1, limit: 10, total: 1, total_pages: 1 };
    mockModelAction.list.mockResolvedValue({ payload, paginationMeta });

    const res = await service.findAll(1, 10);

    expect(mockModelAction.list).toHaveBeenCalledWith({
      paginationPayload: { page: 1, limit: 10 },
      order: { createdAt: 'DESC' },
    });
    expect(res).toEqual({
      data: payload,
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
  });

  it('should throw InternalServerErrorException on failure', async () => {
    mockModelAction.list.mockRejectedValue(new Error('DB fail'));

    await expect(service.findAll()).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
