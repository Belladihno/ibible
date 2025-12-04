import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WaitlistSyncProcessor } from './waitlist-sync.processor';
import { InstantlyService } from '../services/instantly.service';
import { ApolloService } from '../services/apollo.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WaitlistEntry } from 'src/entities/waitlist-entry.entity';
import {
  SalesToolResponse,
  WaitlistSyncJob,
} from 'src/shared/interfaces/sales.interface';

// Silence NestJS logger output during tests
jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

describe('WaitlistSyncProcessor', () => {
  let processor: WaitlistSyncProcessor;
  let instantlyService: jest.Mocked<InstantlyService>;
  let apolloService: jest.Mocked<ApolloService>;
  let waitlistRepo: { update: jest.Mock };

  const mockJob = (data: WaitlistSyncJob): Job<WaitlistSyncJob> =>
    ({ data }) as unknown as Job<WaitlistSyncJob>;

  beforeEach(async () => {
    waitlistRepo = { update: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistSyncProcessor,
        {
          provide: InstantlyService,
          useValue: { addLead: jest.fn() },
        },
        {
          provide: ApolloService,
          useValue: { addLead: jest.fn() },
        },
        {
          provide: getRepositoryToken(WaitlistEntry),
          useValue: waitlistRepo,
        },
      ],
    }).compile();

    processor = module.get(WaitlistSyncProcessor);
    instantlyService = module.get(InstantlyService);
    apolloService = module.get(ApolloService);
  });

  // -------------------------------------------------------------
  // SUCCESS — both services succeed
  // -------------------------------------------------------------
  it('should complete successfully when both services succeed', async () => {
    instantlyService.addLead.mockResolvedValue({
      success: true,
      tool: 'instantly',
    });

    apolloService.addLead.mockResolvedValue({
      success: true,
      tool: 'apollo',
    });

    const job = mockJob({
      id: 'entry-1',
      email: 'test@example.com',
      name: 'John Doe',
    });

    await expect(processor.process(job)).resolves.not.toThrow();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(instantlyService.addLead).toHaveBeenCalledWith(
      'test@example.com',
      'John Doe',
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(apolloService.addLead).toHaveBeenCalledWith(
      'test@example.com',
      'John Doe',
    );

    // Both salesSyncedAt and syncAttemptedAt should be set on success
    expect(waitlistRepo.update).toHaveBeenCalledWith('entry-1', {
      syncAttemptedAt: expect.any(Date),
      salesSyncedAt: expect.any(Date),
    });
  });

  // -------------------------------------------------------------
  // GRACEFUL FAILURE — Instantly fails but job completes
  // -------------------------------------------------------------
  it('should gracefully handle Instantly failure without throwing', async () => {
    instantlyService.addLead.mockResolvedValue({
      success: false,
      tool: 'instantly',
      error: 'API error',
    });

    apolloService.addLead.mockResolvedValue({
      success: true,
      tool: 'apollo',
    });

    const job = mockJob({
      id: 'entry-2',
      email: 'fail@instantly.com',
      name: 'John Doe',
    });

    // Should NOT throw — graceful error handling
    await expect(processor.process(job)).resolves.not.toThrow();

    // Apollo still runs in parallel
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(apolloService.addLead).toHaveBeenCalled();

    // Only syncAttemptedAt should be set on failure (not salesSyncedAt)
    expect(waitlistRepo.update).toHaveBeenCalledWith('entry-2', {
      syncAttemptedAt: expect.any(Date),
    });
  });

  // -------------------------------------------------------------
  // GRACEFUL FAILURE — Apollo fails but job completes
  // -------------------------------------------------------------
  it('should gracefully handle Apollo failure without throwing', async () => {
    instantlyService.addLead.mockResolvedValue({
      success: true,
      tool: 'instantly',
    });

    apolloService.addLead.mockResolvedValue({
      success: false,
      tool: 'apollo',
      error: 'Some apollo failure',
    });

    const job = mockJob({
      id: 'entry-3',
      email: 'apollo@fail.com',
      name: 'Jane Doe',
    });

    // Should NOT throw — graceful error handling
    await expect(processor.process(job)).resolves.not.toThrow();

    // Only syncAttemptedAt should be set on failure (not salesSyncedAt)
    expect(waitlistRepo.update).toHaveBeenCalledWith('entry-3', {
      syncAttemptedAt: expect.any(Date),
    });
  });

  // -------------------------------------------------------------
  // GRACEFUL FAILURE — Both services fail but job completes
  // -------------------------------------------------------------
  it('should gracefully handle both services failing', async () => {
    instantlyService.addLead.mockResolvedValue({
      success: false,
      tool: 'instantly',
      error: 'Instantly error',
    });

    apolloService.addLead.mockResolvedValue({
      success: false,
      tool: 'apollo',
      error: 'Apollo error',
    });

    const job = mockJob({
      id: 'entry-4',
      email: 'both@fail.com',
      name: 'Test',
    });

    // Should NOT throw — graceful error handling
    await expect(processor.process(job)).resolves.not.toThrow();

    // Only syncAttemptedAt should be set on failure (not salesSyncedAt)
    expect(waitlistRepo.update).toHaveBeenCalledWith('entry-4', {
      syncAttemptedAt: expect.any(Date),
    });
  });

  // -------------------------------------------------------------
  // GRACEFUL FAILURE — Instantly throws (Promise rejects)
  // -------------------------------------------------------------
  it('should gracefully handle thrown errors from Instantly', async () => {
    instantlyService.addLead.mockRejectedValue(new Error('Instantly crashed'));

    apolloService.addLead.mockResolvedValue({
      success: true,
      tool: 'apollo',
    });

    const job = mockJob({
      id: 'entry-5',
      email: 'error@instantly.com',
      name: 'Jake',
    });

    // Should NOT throw — graceful error handling
    await expect(processor.process(job)).resolves.not.toThrow();

    // Only syncAttemptedAt should be set on failure (not salesSyncedAt)
    expect(waitlistRepo.update).toHaveBeenCalledWith('entry-5', {
      syncAttemptedAt: expect.any(Date),
    });
  });

  // -------------------------------------------------------------
  // GRACEFUL FAILURE — Apollo throws (Promise rejects)
  // -------------------------------------------------------------
  it('should gracefully handle thrown errors from Apollo', async () => {
    instantlyService.addLead.mockResolvedValue({
      success: true,
      tool: 'instantly',
    });

    apolloService.addLead.mockRejectedValue(new Error('Apollo timeout'));

    const job = mockJob({
      id: 'entry-6',
      email: 'apollo@error.com',
      name: 'Sam',
    });

    // Should NOT throw — graceful error handling
    await expect(processor.process(job)).resolves.not.toThrow();

    // Only syncAttemptedAt should be set on failure (not salesSyncedAt)
    expect(waitlistRepo.update).toHaveBeenCalledWith('entry-6', {
      syncAttemptedAt: expect.any(Date),
    });
  });

  // -------------------------------------------------------------
  // NO ENTRY ID — gracefully skip DB update
  // -------------------------------------------------------------
  it('should handle jobs without entry id', async () => {
    instantlyService.addLead.mockResolvedValue({
      success: true,
      tool: 'instantly',
    });

    apolloService.addLead.mockResolvedValue({
      success: true,
      tool: 'apollo',
    });

    const job = mockJob({ email: 'no-id@example.com', name: 'Test' });

    await expect(processor.process(job)).resolves.not.toThrow();

    // Should not attempt update if no id
    expect(waitlistRepo.update).not.toHaveBeenCalled();
  });
});
