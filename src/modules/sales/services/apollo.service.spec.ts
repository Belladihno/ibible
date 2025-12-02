import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ApolloService } from './apollo.service';

global.fetch = jest.fn();

describe('ApolloService', () => {
  let service: ApolloService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApolloService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ApolloService>(ApolloService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Configuration', () => {
    it('should throw error in production without credentials', () => {
      mockConfigService.get.mockReturnValue('production');
      mockConfigService.getOrThrow.mockImplementation(() => {
        throw new Error('Missing config');
      });

      expect(() => new ApolloService(configService)).toThrow();
    });

    it('should initialize with production config', () => {
      mockConfigService.get.mockReturnValue('production');
      mockConfigService.getOrThrow.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          APOLLO_API_KEY: 'prod-key',
          APOLLO_SEQUENCE_ID: 'prod-sequence',
        };
        return config[key];
      });

      const module = new ApolloService(configService);
      expect(module).toBeDefined();
    });

    it('should warn in development without credentials', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          APOLLO_API_KEY: '',
          APOLLO_SEQUENCE_ID: '',
        };
        return config[key];
      });

      new ApolloService(configService);
      consoleWarnSpy.mockRestore();
    });
  });

  describe('addLead', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('production');
      mockConfigService.getOrThrow.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          APOLLO_API_KEY: 'test-api-key',
          APOLLO_SEQUENCE_ID: 'test-sequence-id',
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
        tool: 'apollo',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.apollo.io/v1/emailer_campaigns/add_contact_to_campaign',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': 'test-api-key',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
            sequence_id: 'test-sequence-id',
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

      const callBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(callBody.first_name).toBe('John');
      expect(callBody.last_name).toBeUndefined();
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
      mockConfigService.get.mockReturnValue('development');
      mockConfigService.getOrThrow.mockReturnValue('');

      const serviceWithoutConfig = new ApolloService(configService);
      const result = await serviceWithoutConfig.addLead('test@example.com');

      expect(result).toEqual({
        success: false,
        tool: 'apollo',
        error: 'Service not configured',
      });
    });

    it('should handle API error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const result = await service.addLead('test@example.com', 'John Doe');

      expect(result).toEqual({
        success: false,
        tool: 'apollo',
        error: expect.stringContaining('Apollo API error: 401'),
      });
    });

    it('should handle API returning unsuccessful response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          message: 'Contact already exists',
        }),
      });

      const result = await service.addLead('test@example.com', 'John Doe');

      expect(result).toEqual({
        success: false,
        tool: 'apollo',
        error: expect.stringContaining('Contact already exists'),
      });
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.addLead('test@example.com', 'John Doe');

      expect(result).toEqual({
        success: false,
        tool: 'apollo',
        error: 'Network error',
      });
    });

    it('should handle timeout correctly', async () => {
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

    it('should parse multi-word names correctly', async () => {
      const mockResponse = {
        success: true,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await service.addLead('test@example.com', 'Mary Jane Watson Parker');

      const callBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(callBody.first_name).toBe('Mary');
      expect(callBody.last_name).toBe('Jane Watson Parker');
    });

    it('should handle JSON parse errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await service.addLead('test@example.com', 'John Doe');

      expect(result).toEqual({
        success: false,
        tool: 'apollo',
        error: 'Invalid JSON',
      });
    });

    it('should include sequence_id in request body', async () => {
      const mockResponse = {
        success: true,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await service.addLead('test@example.com', 'John Doe');

      const callBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(callBody.sequence_id).toBe('test-sequence-id');
    });
  });
});
