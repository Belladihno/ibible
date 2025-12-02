import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { WaitlistSyncProcessor } from './waitlist-sync.processor';
import { InstantlyService } from '../services/instantly.service';
import { ApolloService } from '../services/apollo.service';
import { WaitlistSyncJob } from 'src/shared/interfaces/sales.interface';

describe('WaitlistSyncProcessor', () => {
  let processor: WaitlistSyncProcessor;
  let instantlyService: InstantlyService;
  let apolloService: ApolloService;

  const mockInstantlyService = {
    addLead: jest.fn(),
  };

  const mockApolloService = {
    addLead: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistSyncProcessor,
        {
          provide: InstantlyService,
          useValue: mockInstantlyService,
        },
        {
          provide: ApolloService,
          useValue: mockApolloService,
        },
      ],
    }).compile();

    processor = module.get<WaitlistSyncProcessor>(WaitlistSyncProcessor);
    instantlyService = module.get<InstantlyService>(InstantlyService);
    apolloService = module.get<ApolloService>(ApolloService);
  });

  const createMockJob = (data: WaitlistSyncJob): Job<WaitlistSyncJob> =>
    ({
      id: 'job-123',
      data,
      attemptsMade: 0,
      opts: { attempts: 3 },
      updateProgress: jest.fn(),
    }) as unknown as Job<WaitlistSyncJob>;

  describe('process', () => {
    it('should successfully sync to both services', async () => {
      const jobData = { email: 'test@example.com', name: 'John Doe' };
      const job = createMockJob(jobData);

      mockInstantlyService.addLead.mockResolvedValue({
        success: true,
        tool: 'instantly',
      });
      mockApolloService.addLead.mockResolvedValue({
        success: true,
        tool: 'apollo',
      });

      await processor.process(job);

      expect(instantlyService.addLead).toHaveBeenCalledWith(
        'test@example.com',
        'John Doe',
      );
      expect(apolloService.addLead).toHaveBeenCalledWith(
        'test@example.com',
        'John Doe',
      );
      expect(job.updateProgress).toHaveBeenCalledWith({
        instantlySuccess: true,
        apolloSuccess: true,
        errors: [],
      });
    });

    it('should succeed if at least one service succeeds', async () => {
      const jobData = { email: 'test@example.com', name: 'John Doe' };
      const job = createMockJob(jobData);

      mockInstantlyService.addLead.mockResolvedValue({
        success: true,
        tool: 'instantly',
      });
      mockApolloService.addLead.mockResolvedValue({
        success: false,
        tool: 'apollo',
        error: 'API rate limit',
      });

      await processor.process(job);

      expect(job.updateProgress).toHaveBeenCalledWith({
        instantlySuccess: true,
        apolloSuccess: false,
        errors: ['Apollo: API rate limit'],
      });
    });

    it('should throw error when both services fail', async () => {
      const jobData = { email: 'test@example.com', name: 'John Doe' };
      const job = createMockJob(jobData);

      mockInstantlyService.addLead.mockResolvedValue({
        success: false,
        tool: 'instantly',
        error: 'Connection failed',
      });
      mockApolloService.addLead.mockResolvedValue({
        success: false,
        tool: 'apollo',
        error: 'Timeout',
      });

      await expect(processor.process(job)).rejects.toThrow(
        'All sales tools failed',
      );
    });

    it('should handle service rejections', async () => {
      const jobData = { email: 'test@example.com', name: 'John Doe' };
      const job = createMockJob(jobData);

      mockInstantlyService.addLead.mockRejectedValue(
        new Error('Network error'),
      );
      mockApolloService.addLead.mockResolvedValue({
        success: true,
        tool: 'apollo',
      });

      await processor.process(job);

      expect(job.updateProgress).toHaveBeenCalledWith({
        instantlySuccess: false,
        apolloSuccess: true,
        errors: ['Instantly: Network error'],
      });
    });

    it('should handle non-Error rejections', async () => {
      const jobData = { email: 'test@example.com', name: 'John Doe' };
      const job = createMockJob(jobData);

      mockInstantlyService.addLead.mockRejectedValue('String error');
      mockApolloService.addLead.mockResolvedValue({
        success: true,
        tool: 'apollo',
      });

      await processor.process(job);

      expect(job.updateProgress).toHaveBeenCalledWith({
        instantlySuccess: false,
        apolloSuccess: true,
        errors: ['Instantly: String error'],
      });
    });

    it('should handle missing name', async () => {
      const jobData = { email: 'test@example.com' };
      const job = createMockJob(jobData);

      mockInstantlyService.addLead.mockResolvedValue({
        success: true,
        tool: 'instantly',
      });
      mockApolloService.addLead.mockResolvedValue({
        success: true,
        tool: 'apollo',
      });

      await processor.process(job);

      expect(instantlyService.addLead).toHaveBeenCalledWith(
        'test@example.com',
        undefined,
      );
      expect(apolloService.addLead).toHaveBeenCalledWith(
        'test@example.com',
        undefined,
      );
    });

    it('should sync to services in parallel', async () => {
      const jobData = { email: 'test@example.com', name: 'John Doe' };
      const job = createMockJob(jobData);

      const instantlyDelay = 1000;
      const apolloDelay = 500;

      mockInstantlyService.addLead.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ success: true, tool: 'instantly' }),
              instantlyDelay,
            ),
          ),
      );
      mockApolloService.addLead.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ success: true, tool: 'apollo' }),
              apolloDelay,
            ),
          ),
      );

      const startTime = Date.now();
      await processor.process(job);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in ~1000ms (longest delay), not 1500ms (sum of delays)
      expect(duration).toBeLessThan(1500);
      expect(duration).toBeGreaterThanOrEqual(instantlyDelay - 100);
    });

    it('should handle undefined error messages', async () => {
      const jobData = { email: 'test@example.com', name: 'John Doe' };
      const job = createMockJob(jobData);

      mockInstantlyService.addLead.mockResolvedValue({
        success: false,
        tool: 'instantly',
        error: undefined,
      });
      mockApolloService.addLead.mockResolvedValue({
        success: true,
        tool: 'apollo',
      });

      await processor.process(job);

      expect(job.updateProgress).toHaveBeenCalledWith({
        instantlySuccess: false,
        apolloSuccess: true,
        errors: ['Instantly: Unknown error'],
      });
    });
  });

  describe('onActive', () => {
    it('should log when job becomes active', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const job = createMockJob({ email: 'test@example.com' });

      processor.onActive(job);

      consoleLogSpy.mockRestore();
    });
  });

  describe('onCompleted', () => {
    it('should log when job completes', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const job = createMockJob({ email: 'test@example.com' });

      processor.onCompleted(job);

      consoleLogSpy.mockRestore();
    });
  });

  describe('onFailed', () => {
    it('should log error with job details', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const job = createMockJob({ email: 'test@example.com' });
      const error = new Error('Processing failed');

      processor.onFailed(job, error);

      consoleErrorSpy.mockRestore();
    });

    it('should handle undefined job', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Processing failed');

      processor.onFailed(undefined, error);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('normalizeResult', () => {
    it('should return null for fulfilled successful result', () => {
      const result = {
        status: 'fulfilled' as const,
        value: { success: true, tool: 'instantly' as const },
      };

      const normalized = (processor as any).normalizeResult(result);

      expect(normalized).toBeNull();
    });

    it('should return error message for fulfilled failed result', () => {
      const result = {
        status: 'fulfilled' as const,
        value: {
          success: false,
          tool: 'instantly' as const,
          error: 'API error',
        },
      };

      const normalized = (processor as any).normalizeResult(result);

      expect(normalized).toBe('API error');
    });

    it('should return "Unknown error" for fulfilled failed result without error', () => {
      const result = {
        status: 'fulfilled' as const,
        value: { success: false, tool: 'instantly' as const },
      };

      const normalized = (processor as any).normalizeResult(result);

      expect(normalized).toBe('Unknown error');
    });

    it('should return error message for rejected result with Error', () => {
      const result = {
        status: 'rejected' as const,
        reason: new Error('Network failure'),
      };

      const normalized = (processor as any).normalizeResult(result);

      expect(normalized).toBe('Network failure');
    });

    it('should convert non-Error reason to string', () => {
      const result = {
        status: 'rejected' as const,
        reason: 'String error',
      };

      const normalized = (processor as any).normalizeResult(result);

      expect(normalized).toBe('String error');
    });
  });
});
