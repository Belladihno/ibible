/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { AuthGuard } from '@nestjs/passport';

describe('HistoryController', () => {
  let controller: HistoryController;
  let service: HistoryService;

  const mockHistoryService = {
    getUnifiedHistory: jest.fn(),
  };

  const mockRequest = {
    user: {
      userId: 'test-user-123',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HistoryController],
      providers: [
        {
          provide: HistoryService,
          useValue: mockHistoryService,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<HistoryController>(HistoryController);
    service = module.get<HistoryService>(HistoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHistory', () => {
    it('should return unified history with default pagination', async () => {
      const mockResponse = {
        history: [
          {
            id: 'chat-1',
            type: 'chat' as const,
            title: 'Test Chat',
            lastActivity: new Date('2025-12-03'),
            preview: 'Hello',
            messageCount: 5,
            createdAt: new Date('2025-12-01'),
            metadata: {},
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
        },
      };

      mockHistoryService.getUnifiedHistory.mockResolvedValue(mockResponse);

      const result = await controller.getHistory(
        mockRequest as any,
        undefined,
        undefined,
      );

      expect(service.getUnifiedHistory).toHaveBeenCalledWith(
        'test-user-123',
        1,
        20,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should use custom page and limit parameters', async () => {
      const mockResponse = {
        history: [],
        pagination: {
          total: 0,
          page: 2,
          limit: 10,
        },
      };

      mockHistoryService.getUnifiedHistory.mockResolvedValue(mockResponse);

      await controller.getHistory(mockRequest as any, 2, 10);

      expect(service.getUnifiedHistory).toHaveBeenCalledWith(
        'test-user-123',
        2,
        10,
      );
    });

    it('should handle invalid page numbers', async () => {
      const mockResponse = {
        history: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
        },
      };

      mockHistoryService.getUnifiedHistory.mockResolvedValue(mockResponse);

      // Negative page should default to 1
      await controller.getHistory(mockRequest as any, -1, undefined);

      expect(service.getUnifiedHistory).toHaveBeenCalledWith(
        'test-user-123',
        1,
        20,
      );

      // Zero page should default to 1
      await controller.getHistory(mockRequest as any, 0, undefined);

      expect(service.getUnifiedHistory).toHaveBeenCalledWith(
        'test-user-123',
        1,
        20,
      );
    });

    it('should handle invalid limit numbers', async () => {
      const mockResponse = {
        history: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
        },
      };

      mockHistoryService.getUnifiedHistory.mockResolvedValue(mockResponse);

      // Negative limit should default to 20
      await controller.getHistory(mockRequest as any, undefined, -5);

      expect(service.getUnifiedHistory).toHaveBeenCalledWith(
        'test-user-123',
        1,
        20,
      );

      // Zero limit should default to 20
      await controller.getHistory(mockRequest as any, undefined, 0);

      expect(service.getUnifiedHistory).toHaveBeenCalledWith(
        'test-user-123',
        1,
        20,
      );
    });

    it('should extract userId from different JWT payload formats', async () => {
      const mockResponse = {
        history: [],
        pagination: { total: 0, page: 1, limit: 20 },
      };

      mockHistoryService.getUnifiedHistory.mockResolvedValue(mockResponse);

      // Test with userId field
      const req1 = { user: { userId: 'user-1' } };
      await controller.getHistory(req1 as any, undefined, undefined);
      expect(service.getUnifiedHistory).toHaveBeenCalledWith('user-1', 1, 20);

      // Test with sub field
      const req2 = { user: { sub: 'user-2' } };
      await controller.getHistory(req2 as any, undefined, undefined);
      expect(service.getUnifiedHistory).toHaveBeenCalledWith('user-2', 1, 20);

      // Test with id field
      const req3 = { user: { id: 'user-3' } };
      await controller.getHistory(req3 as any, undefined, undefined);
      expect(service.getUnifiedHistory).toHaveBeenCalledWith('user-3', 1, 20);
    });

    it('should throw error if userId is missing', async () => {
      const reqWithoutUser = { user: {} };

      await expect(
        controller.getHistory(reqWithoutUser as any, undefined, undefined),
      ).rejects.toThrow('Invalid user id');
    });

    it('should throw error if userId is not a string', async () => {
      const reqWithInvalidUser = { user: { userId: 123 } };

      await expect(
        controller.getHistory(reqWithInvalidUser as any, undefined, undefined),
      ).rejects.toThrow('Invalid user id');
    });

    it('should return all history types', async () => {
      const mockResponse = {
        history: [
          {
            id: 'chat-1',
            type: 'chat' as const,
            title: 'Chat',
            lastActivity: new Date('2025-12-04'),
            preview: 'Hi',
            messageCount: 3,
            createdAt: new Date('2025-12-01'),
            metadata: {},
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
        },
      };

      mockHistoryService.getUnifiedHistory.mockResolvedValue(mockResponse);

      const result = await controller.getHistory(
        mockRequest as any,
        undefined,
        undefined,
      );

      expect(result.history).toHaveLength(1);
      expect(result.history[0].type).toBe('chat');
    });
  });
});
