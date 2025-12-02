import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WaitlistSyncProcessor } from './waitlist-sync.processor';
import { InstantlyService } from '../services/instantly.service';
import { ApolloService } from '../services/apollo.service';
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

  const mockJob = (data: WaitlistSyncJob): Job<WaitlistSyncJob> =>
    ({ data }) as Job<WaitlistSyncJob>;

  beforeEach(async () => {
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

    const job = mockJob({ email: 'test@example.com', name: 'John Doe' });

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
  });

  // -------------------------------------------------------------
  // FAILURE — Instantly fails first
  // -------------------------------------------------------------
  it('should throw when Instantly fails', async () => {
    instantlyService.addLead.mockResolvedValue({
      success: false,
      tool: 'instantly',
      error: 'API error',
    });

    apolloService.addLead.mockResolvedValue({
      success: true,
      tool: 'apollo',
    });

    const job = mockJob({ email: 'fail@instantly.com', name: 'John Doe' });

    await expect(processor.process(job)).rejects.toThrow(
      'Instantly sync failed: API error',
    );

    // Apollo still runs in parallel
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(apolloService.addLead).toHaveBeenCalled();
  });

  // -------------------------------------------------------------
  // FAILURE — Apollo fails after Instantly succeeds
  // -------------------------------------------------------------
  it('should throw when Apollo fails', async () => {
    instantlyService.addLead.mockResolvedValue({
      success: true,
      tool: 'instantly',
    });

    apolloService.addLead.mockResolvedValue({
      success: false,
      tool: 'apollo',
      error: 'Some apollo failure',
    });

    const job = mockJob({ email: 'apollo@fail.com', name: 'Jane Doe' });

    await expect(processor.process(job)).rejects.toThrow(
      'Apollo sync failed: Some apollo failure',
    );
  });

  // -------------------------------------------------------------
  // FAILURE — Instantly throws (Promise rejects)
  // -------------------------------------------------------------
  it('should normalize thrown errors from Instantly', async () => {
    instantlyService.addLead.mockRejectedValue(new Error('Instantly crashed'));

    apolloService.addLead.mockResolvedValue({
      success: true,
      tool: 'apollo',
    });

    const job = mockJob({ email: 'error@instantly.com', name: 'Jake' });

    await expect(processor.process(job)).rejects.toThrow(
      'Instantly sync failed: Instantly crashed',
    );
  });

  // -------------------------------------------------------------
  // FAILURE — Apollo throws (Promise rejects)
  // -------------------------------------------------------------
  it('should normalize thrown errors from Apollo', async () => {
    instantlyService.addLead.mockResolvedValue({
      success: true,
      tool: 'instantly',
    });

    apolloService.addLead.mockRejectedValue(new Error('Apollo timeout'));

    const job = mockJob({ email: 'apollo@error.com', name: 'Sam' });

    await expect(processor.process(job)).rejects.toThrow(
      'Apollo sync failed: Apollo timeout',
    );
  });
});
