import { InstantlyService } from './instantly.service';
import { ConfigService } from '@nestjs/config';

describe('InstantlyService', () => {
  let service: InstantlyService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    configService = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
    } as any;

    // Default mock for environment
    configService.get.mockImplementation(
      (key: string, defaultValue?: string) => {
        const configMap: Record<string, any> = {
          NODE_ENV: 'development',
          INSTANTLY_API_KEY: 'test-api-key',
          INSTANTLY_CAMPAIGN_ID: 'test-campaign-id',
        };
        return configMap[key] ?? defaultValue;
      },
    );

    service = new InstantlyService(configService);

    // mock fetch
    global.fetch = jest.fn() as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------
  // SERVICE NOT CONFIGURED
  // -----------------------------
  it('should return error when Instantly is not configured', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'INSTANTLY_API_KEY' || key === 'INSTANTLY_CAMPAIGN_ID') {
        return '';
      }
      return 'development';
    });

    service = new InstantlyService(configService);

    const result = await service.addLead('test@example.com', 'John Doe');

    expect(result).toEqual({
      success: false,
      tool: 'instantly',
      error: 'Service not configured',
    });
  });

  // -----------------------------
  // SUCCESS CASE
  // -----------------------------
  it('should successfully add lead', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
        }),
      }),
    );

    const result = await service.addLead('test@example.com', 'John Doe');

    expect(global.fetch).toHaveBeenCalledTimes(1);

    const fetchArgs = (global.fetch as jest.Mock).mock.calls[0];

    expect(fetchArgs[0]).toBe('https://api.instantly.ai/api/v1/lead/add');

    expect(result).toEqual({
      success: true,
      tool: 'instantly',
    });
  });

  // -----------------------------
  // FAILED RESPONSE
  // -----------------------------
  it('should return error when API fails', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      }),
    );

    const result = await service.addLead('test@example.com', 'John Doe');

    expect(result.success).toBe(false);
    expect(result.tool).toBe('instantly');
    expect(result.error).toContain('Instantly API error');
  });
});
