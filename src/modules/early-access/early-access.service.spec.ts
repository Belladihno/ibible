/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { EarlyAccessService } from './early-access.service';
import { EarlyAccessEntryModelAction } from 'src/actions/model-actions';
import { ConflictException } from '@nestjs/common';

describe('EarlyAccessService', () => {
  let service: EarlyAccessService;
  let modelAction: jest.Mocked<EarlyAccessEntryModelAction>;

  beforeEach(async () => {
    const mockModelAction = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EarlyAccessService,
        {
          provide: EarlyAccessEntryModelAction,
          useValue: mockModelAction,
        },
      ],
    }).compile();

    service = module.get<EarlyAccessService>(EarlyAccessService);
    modelAction = module.get(EarlyAccessEntryModelAction);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create early access entry successfully', async () => {
      const createDto = { name: 'John Doe', email: 'john@example.com' };
      const mockEntry = {
        id: 1,
        firstName: 'John Doe',
        email: 'john@example.com',
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      modelAction.create.mockResolvedValue(mockEntry);

      const result = await service.create(createDto);

      expect(modelAction.create).toHaveBeenCalledWith({
        createPayload: { email: 'john@example.com', firstName: 'John Doe' },
        transactionOptions: { useTransaction: false },
      });
      expect(result).toEqual({
        message: 'Success! Your early access request has been submitted.',
        email: 'john@example.com',
        name: 'John Doe',
      });
    });

    it('should throw ConflictException for duplicate email', async () => {
      const createDto = { name: 'John Doe', email: 'john@example.com' };

      modelAction.create.mockRejectedValue({ code: '23505' }); // Unique constraint violation

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(modelAction.create).toHaveBeenCalledWith({
        createPayload: { email: 'john@example.com', firstName: 'John Doe' },
        transactionOptions: { useTransaction: false },
      });
    });

    it('should throw InternalServerErrorException for other errors', async () => {
      const createDto = { name: 'John Doe', email: 'john@example.com' };

      modelAction.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createDto)).rejects.toThrow(
        'Internal Server Error',
      );
    });
  });
});
