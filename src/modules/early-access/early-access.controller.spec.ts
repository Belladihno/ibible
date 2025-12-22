/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { EarlyAccessController } from './early-access.controller';
import { EarlyAccessService } from './early-access.service';
import { ConflictException } from '@nestjs/common';

describe('EarlyAccessController', () => {
  let controller: EarlyAccessController;
  let service: jest.Mocked<EarlyAccessService>;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EarlyAccessController],
      providers: [
        {
          provide: EarlyAccessService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<EarlyAccessController>(EarlyAccessController);
    service = module.get(EarlyAccessService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create early access entry and return success response', async () => {
      const createDto = { name: 'John Doe', email: 'john@example.com' };
      const mockResponse = {
        message: 'Success! Your early access request has been submitted.',
        email: 'john@example.com',
        name: 'John Doe',
      };

      service.create.mockResolvedValue(mockResponse);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockResponse);
    });

    it('should throw ConflictException for duplicate email', async () => {
      const createDto = { name: 'John Doe', email: 'john@example.com' };

      service.create.mockRejectedValue(
        new ConflictException(
          'This email is already registered for early access.',
        ),
      );

      await expect(controller.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
