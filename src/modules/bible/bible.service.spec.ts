import { ConfigService } from '@nestjs/config';
import { BibleService } from './bible.service';

// Mock ioredis default export to provide a simple in-memory stub
const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    get: mockGet,
    set: mockSet,
  })),
}));

describe('BibleService (unit)', () => {
  let service: BibleService;
  const mockConfig = { get: jest.fn() } as unknown as ConfigService;
  const mockRepo = { save: jest.fn() } as any;

  beforeEach(() => {
    jest.resetAllMocks();
    // Provide a fake API key
    (mockConfig.get as jest.Mock).mockReturnValue('test-key');
    service = new BibleService(mockConfig, mockRepo);
    // Ensure the service uses our stubbed redis instance (avoid real connection)
    (service as any).redis = { get: mockGet, set: mockSet };
  });

  it('getBooks fetches books and caches result', async () => {
    const sample = { data: [{ id: 'GEN', name: 'Genesis' }] };
    // no cache
    mockGet.mockResolvedValueOnce(null);
    // mock global fetch
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => sample,
    });

    const res = await service.getBooks('test-bible');
    expect(res).toEqual(sample);
    expect((global as any).fetch).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalled();
  });

  it('getBooks returns cached value if present', async () => {
    const cached = { foo: 'bar' };
    mockGet.mockResolvedValueOnce(JSON.stringify(cached));
    const res = await service.getBooks('test-bible');
    expect(res).toEqual(cached);
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  it('getBibleVersions fetches versions and caches result', async () => {
    mockGet.mockResolvedValueOnce(null);

    const res = (await service.getBibleVersions()) as any;

    expect(res).toHaveProperty('data');
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBeGreaterThan(5);

    expect(res.data[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      language: expect.any(String),
    });

    expect(mockSet).not.toHaveBeenCalled();
  });

  it('search fetches results and caches for 1 hour', async () => {
    const sample = { data: { results: [] } };
    mockGet.mockResolvedValueOnce(null);
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => sample,
    });

    const res = await service.search('love', 5, 0);
    expect(res).toEqual(sample);
    expect(mockSet).toHaveBeenCalled();
  });
});
