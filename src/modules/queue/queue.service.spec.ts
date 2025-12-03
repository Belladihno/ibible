import { Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QueueManagerService } from './queue.service';
import { QueueName } from './queue-names.enum';

// --- No unnecessary type assertion here ---
jest.mock('@nestjs/common', () => {
  const actual: typeof import('@nestjs/common') =
    jest.requireActual('@nestjs/common');
  return {
    ...actual,
    Logger: jest.fn().mockImplementation(() => ({
      log: jest.fn(),
      error: jest.fn(),
    })),
  };
});

describe('QueueHealthService', () => {
  let service: QueueManagerService;
  let mockQueue: jest.Mocked<Queue>;

  // Declare each mock function as a `const` (prevents unbound-method ESLint errors)
  let getWaitingCount: jest.Mock<Promise<number>, []>;
  let getActiveCount: jest.Mock<Promise<number>, []>;
  let getCompletedCount: jest.Mock<Promise<number>, []>;
  let getFailedCount: jest.Mock<Promise<number>, []>;
  let getDelayedCount: jest.Mock<Promise<number>, []>;
  let isPaused: jest.Mock<Promise<boolean>, []>;
  let clean: jest.Mock<Promise<void>, [number, number, string]>;

  beforeEach(() => {
    // initialize mocks as standalone constants
    getWaitingCount = jest.fn(async () => 5);
    getActiveCount = jest.fn(async () => 2);
    getCompletedCount = jest.fn(async () => 10);
    getFailedCount = jest.fn(async () => 1);
    getDelayedCount = jest.fn(async () => 3);
    isPaused = jest.fn(async () => false);
    clean = jest.fn(async (_grace: number, _limit: number, _type: string) => {
      return undefined;
    });

    // build mockQueue from those consts
    mockQueue = {
      getWaitingCount,
      getActiveCount,
      getCompletedCount,
      getFailedCount,
      getDelayedCount,
      isPaused,
      clean,
      // other Queue members can be omitted for the tests; TS requires some members so we cast
    } as unknown as jest.Mocked<Queue>;

    service = new QueueManagerService(mockQueue);
  });

  describe('getQueueHealth', () => {
    it('should return queue health stats', async () => {
      const result = await service.getQueueHealth(QueueName.WAITLIST_SYNC);

      expect(result).toEqual({
        name: QueueName.WAITLIST_SYNC,
        waiting: 5,
        active: 2,
        completed: 10,
        failed: 1,
        delayed: 3,
        isPaused: false,
      });

      // ASSERT ON THE STANDALONE MOCK CONSTS (no unbound-method ESLint issue)
      expect(getWaitingCount).toHaveBeenCalled();
      expect(getActiveCount).toHaveBeenCalled();
      expect(getCompletedCount).toHaveBeenCalled();
      expect(getFailedCount).toHaveBeenCalled();
      expect(getDelayedCount).toHaveBeenCalled();
      expect(isPaused).toHaveBeenCalled();
    });

    it('should throw when queue fails', async () => {
      getWaitingCount.mockRejectedValueOnce(new Error('Fail'));

      await expect(
        service.getQueueHealth(QueueName.WAITLIST_SYNC),
      ).rejects.toThrow('Fail');
    });
  });

  describe('cleanQueue', () => {
    it('should clean completed and failed jobs', async () => {
      await service.cleanQueue(QueueName.WAITLIST_SYNC, 1000);

      // assert against the standalone `clean` mock
      expect(clean).toHaveBeenCalledTimes(2);

      expect(clean).toHaveBeenNthCalledWith(1, 1000, 100, 'completed');
      expect(clean).toHaveBeenNthCalledWith(2, 1000 * 7, 100, 'failed');
    });

    it('should not throw even if clean fails', async () => {
      clean.mockRejectedValueOnce(new Error('Clean error'));

      await expect(
        service.cleanQueue(QueueName.WAITLIST_SYNC),
      ).resolves.not.toThrow();
    });
  });
});
