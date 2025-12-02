import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';

describe('WaitlistController', () => {
  let controller: WaitlistController;

  let createMock: jest.Mock<
    Promise<{ message: string; email: string; name: string }>,
    [CreateWaitlistEntryDto]
  >;

  beforeEach(async () => {
    createMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WaitlistController],
      providers: [
        {
          provide: WaitlistService,
          useValue: { create: createMock },
        },
      ],
    }).compile();

    controller = module.get(WaitlistController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call WaitlistService.create() with correct DTO and return response', async () => {
      const dto: CreateWaitlistEntryDto = {
        name: 'John Doe',
        email: 'john.doe@example.com',
      };

      const expectedResponse = {
        message: 'Success! User added to the waitlist.',
        email: dto.email,
        name: dto.name!,
      };

      createMock.mockResolvedValue(expectedResponse);

      const result = await controller.create(dto);

      expect(createMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });

    it('should propagate errors from WaitlistService.create()', async () => {
      const dto: CreateWaitlistEntryDto = {
        name: 'Fail User',
        email: 'fail@example.com',
      };

      createMock.mockRejectedValue(new Error('Test error'));

      await expect(controller.create(dto)).rejects.toThrow('Test error');
    });
  });
});
