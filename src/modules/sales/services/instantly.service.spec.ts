import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InstantlyService } from './instantly.service';

global.fetch = jest.fn();

describe('InstantlyService', () => {
  let service: InstantlyService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstantlyService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<InstantlyService>(InstantlyService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize with production config when NODE_ENV is production', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'production',
          INSTANTLY_API_KEY: 'prod-key',
          INSTANTLY_CAMPAIGN_ID: 'prod-campaign',
        };
        return config[key];
      });

      const module = new InstantlyService(configService);
      expect(module).toBeDefined();
    });

    it('should initialize gracefully without credentials in development', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          INSTANTLY_API_KEY: '',
          INSTANTLY_CAMPAIGN_ID: '',
        };
        return config[key];
      });

      const module = new InstantlyService(configService);
      expect(module).toBeDefined();
    });
  });

  describe('addLead', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'production',
          INSTANTLY_API_KEY: 'test-api-key',
          INSTANTLY_CAMPAIGN_ID: 'test-campaign-id',
        };
        return config[key];
      });
    });

    it('should successfully add lead with full name', async () => {
      const mockResponse = {
        success: true,
        contact: { email: 'test@example.com' },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.addLead('test@example.com', 'John Doe');

      expect(result).toEqual({
        success: true,
        tool: 'instantly',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.instantly.ai/api/v1/lead/add',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
            campaign_id: 'test-campaign-id',
          }),
        }),
      );
    });

    it('should handle single name correctly', async () => {
      const mockResponse = {
        success: true,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await service.addLead('test@example.com', 'John');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"first_name":"John"'),
        }),
      );
    });

    it('should handle missing name', async () => {
      const mockResponse = {
        success: true,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await service.addLead('test@example.com');

      const callBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(callBody.first_name).toBeUndefined();
      expect(callBody.last_name).toBeUndefined();
    });

    it('should return error when service not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          INSTANTLY_API_KEY: '',
          INSTANTLY_CAMPAIGN_ID: '',
        };
        return config[key];
      });

      const serviceWithoutConfig = new InstantlyService(configService);
      const result = await serviceWithoutConfig.addLead('test@example.com');

      expect(result).toEqual({
        success: false,
        tool: 'instantly',
        error: 'Service not configured',
      });
    });

    it('should handle API error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      const result = await service.addLead('test@example.com', 'John Doe');

      expect(result).toEqual({
        success: false,
        tool: 'instantly',
        error: expect.stringContaining('Instantly API error: 400'),
      });
    });

    it('should handle API returning unsuccessful response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          message: 'Email already exists',
        }),
      });

      const result = await service.addLead('test@example.com', 'John Doe');

      expect(result).toEqual({
        success: false,
        tool: 'instantly',
        error: expect.stringContaining('Email already exists'),
      });
    });

    it('should handle network timeout', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 100);
          }),
      );

      const result = await service.addLead('test@example.com', 'John Doe');

      expect(result).toEqual({
        success: false,
        tool: 'instantly',
        error: 'Timeout',
      });
    });

    it('should handle AbortController timeout', async () => {
      jest.useFakeTimers();

      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true }), 15000);
          }),
      );

      const resultPromise = service.addLead('test@example.com', 'John Doe');
      jest.advanceTimersByTime(10000);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      jest.useRealTimers();
    });

    it('should parse multi-word last names correctly', async () => {
      const mockResponse = {
        success: true,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await service.addLead('test@example.com', 'John von Der Berg');

      const callBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(callBody.first_name).toBe('John');
      expect(callBody.last_name).toBe('von Der Berg');
    });
  });
});
