import { Test, TestingModule } from '@nestjs/testing';
import { ApolloService } from './apollo.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

// Silence logs during tests
jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

// Global fetch mock
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('ApolloService', () => {
  let configMock: jest.Mocked<ConfigService>;

  const createService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApolloService,
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    return module.get(ApolloService);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    configMock = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
    } as any;
  });

  // -------------------------------------------------------------
  // 1. Missing configuration → should gracefully skip
  // -------------------------------------------------------------
  it('should skip sync if API key or sequenceId is missing', async () => {
    configMock.get.mockImplementation((key) => {
      if (key === 'NODE_ENV') return 'development';
      return ''; // missing keys
    });
    configMock.getOrThrow.mockImplementation(() => '');

    const service = await createService();

    const response = await service.addLead('test@example.com', 'John Doe');

    expect(mockFetch).not.toHaveBeenCalled();
    expect(response).toEqual({
      success: false,
      tool: 'apollo',
      error:
        'Service not configured - missing APOLLO_API_KEY or APOLLO_SEQUENCE_ID',
    });
  });

  // -------------------------------------------------------------
  // 2. Successful API call
  // -------------------------------------------------------------
  it('should successfully add lead when API responds OK', async () => {
    configMock.get.mockImplementation((key) =>
      key === 'NODE_ENV' ? 'production' : '',
    );
    configMock.getOrThrow.mockImplementation((key) => {
      if (key === 'APOLLO_API_KEY') return 'test-key';
      if (key === 'APOLLO_SEQUENCE_ID') return 'sequence-123';
      return '';
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const service = await createService();

    const res = await service.addLead('jane@example.com', 'Jane Doe');

    expect(mockFetch).toHaveBeenCalled();
    expect(res.success).toBe(true);
  });

  // -------------------------------------------------------------
  // 3. Non-OK API response (e.g. 500)
  // -------------------------------------------------------------
  it('should return error when API returns non-OK response', async () => {
    configMock.get.mockImplementation((key) =>
      key === 'NODE_ENV' ? 'production' : '',
    );
    configMock.getOrThrow.mockImplementation((key) => {
      if (key === 'APOLLO_API_KEY') return 'test-key';
      if (key === 'APOLLO_SEQUENCE_ID') return 'sequence-123';
      return '';
    });

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Server error',
    } as Response);

    const service = await createService();

    const res = await service.addLead('fail@example.com');

    expect(res.success).toBe(false);
    expect(res.error).toContain('500');
  });

  // -------------------------------------------------------------
  // 4. API success=false response
  // -------------------------------------------------------------
  it('should return error when Apollo API returns success=false', async () => {
    configMock.get.mockImplementation((key) =>
      key === 'NODE_ENV' ? 'production' : '',
    );
    configMock.getOrThrow.mockImplementation((key) => {
      if (key === 'APOLLO_API_KEY') return 'test-key';
      if (key === 'APOLLO_SEQUENCE_ID') return 'sequence-123';
      return '';
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, message: 'unsuccessful' }),
    } as Response);

    const service = await createService();

    const res = await service.addLead('bad@example.com');

    expect(res.success).toBe(false);
    expect(res.error).toContain('unsuccessful');
  });

  // -------------------------------------------------------------
  // 5. Network error (fetch throws)
  // -------------------------------------------------------------
  it('should handle fetch throwing an error', async () => {
    configMock.get.mockImplementation((key) =>
      key === 'NODE_ENV' ? 'production' : '',
    );
    configMock.getOrThrow.mockImplementation((key) => {
      if (key === 'APOLLO_API_KEY') return 'test-key';
      if (key === 'APOLLO_SEQUENCE_ID') return 'sequence-123';
      return '';
    });

    mockFetch.mockRejectedValue(new Error('Network fail'));

    const service = await createService();

    const res = await service.addLead('throw@example.com');

    expect(res.success).toBe(false);
    expect(res.error).toBe('Network fail');
  });
});
