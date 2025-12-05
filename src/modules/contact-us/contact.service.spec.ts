import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { InternalServerErrorException } from '@nestjs/common';
import { Contact, EnquiryType } from 'src/entities/contact-us.entity';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/contact-us.dto';

type MockRepository<T extends ObjectLiteral = any> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepository = <
  T extends ObjectLiteral = any,
>(): MockRepository<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
});

describe('ContactService', () => {
  let service: ContactService;
  let contactRepository: MockRepository<Contact>;

  const mockCreateContactDto: CreateContactDto = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    enquiryType: EnquiryType.GENERAL_ENQUIRY,
    message: 'I would like to know more about your services.',
  };

  const mockContact: Contact = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Doe',
    email: 'john.doe@example.com',
    enquiryType: EnquiryType.GENERAL_ENQUIRY,
    message: 'I would like to know more about your services.',
    createdAt: new Date('2025-12-05T10:30:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        {
          provide: getRepositoryToken(Contact),
          useValue: createMockRepository<Contact>(),
        },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
    contactRepository = module.get<MockRepository<Contact>>(
      getRepositoryToken(Contact),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createContact', () => {
    it('should successfully create and save a contact message', async () => {
      // Arrange
      contactRepository.create?.mockReturnValue(mockContact);
      contactRepository.save?.mockResolvedValue(mockContact);

      // Act
      const result = await service.createContact(mockCreateContactDto);

      // Assert
      expect(contactRepository.create).toHaveBeenCalledWith(
        mockCreateContactDto,
      );
      expect(contactRepository.create).toHaveBeenCalledTimes(1);
      expect(contactRepository.save).toHaveBeenCalledWith(mockContact);
      expect(contactRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockContact);
    });

    it('should create a contact with TECHNICAL_ENQUIRY type', async () => {
      // Arrange
      const technicalEnquiryDto: CreateContactDto = {
        ...mockCreateContactDto,
        enquiryType: EnquiryType.TECHNICAL_ENQUIRY,
      };
      const technicalContact: Contact = {
        ...mockContact,
        enquiryType: EnquiryType.TECHNICAL_ENQUIRY,
      };

      contactRepository.create?.mockReturnValue(technicalContact);
      contactRepository.save?.mockResolvedValue(technicalContact);

      // Act
      const result = await service.createContact(technicalEnquiryDto);

      // Assert
      expect(result.enquiryType).toBe(EnquiryType.TECHNICAL_ENQUIRY);
      expect(contactRepository.create).toHaveBeenCalledWith(
        technicalEnquiryDto,
      );
    });

    it('should create a contact with FEEDBACK type', async () => {
      // Arrange
      const feedbackDto: CreateContactDto = {
        ...mockCreateContactDto,
        enquiryType: EnquiryType.FEEDBACK,
      };
      const feedbackContact: Contact = {
        ...mockContact,
        enquiryType: EnquiryType.FEEDBACK,
      };

      contactRepository.create?.mockReturnValue(feedbackContact);
      contactRepository.save?.mockResolvedValue(feedbackContact);

      // Act
      const result = await service.createContact(feedbackDto);

      // Assert
      expect(result.enquiryType).toBe(EnquiryType.FEEDBACK);
    });

    it('should throw InternalServerErrorException when repository.create throws an error', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      contactRepository.create?.mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      await expect(service.createContact(mockCreateContactDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.createContact(mockCreateContactDto)).rejects.toThrow(
        'Failed to save contact message. Please try again later.',
      );
      expect(contactRepository.create).toHaveBeenCalledWith(
        mockCreateContactDto,
      );
      expect(contactRepository.save).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException when repository.save throws an error', async () => {
      // Arrange
      const error = new Error('Database save failed');
      contactRepository.create?.mockReturnValue(mockContact);
      contactRepository.save?.mockRejectedValue(error);

      // Act & Assert
      await expect(service.createContact(mockCreateContactDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.createContact(mockCreateContactDto)).rejects.toThrow(
        'Failed to save contact message. Please try again later.',
      );
      expect(contactRepository.create).toHaveBeenCalledWith(
        mockCreateContactDto,
      );
      expect(contactRepository.save).toHaveBeenCalledWith(mockContact);
    });

    it('should handle contacts with long messages', async () => {
      // Arrange
      const longMessageDto: CreateContactDto = {
        ...mockCreateContactDto,
        message: 'A'.repeat(1000),
      };
      const longMessageContact: Contact = {
        ...mockContact,
        message: 'A'.repeat(1000),
      };

      contactRepository.create?.mockReturnValue(longMessageContact);
      contactRepository.save?.mockResolvedValue(longMessageContact);

      // Act
      const result = await service.createContact(longMessageDto);

      // Assert
      expect(result.message).toHaveLength(1000);
      expect(contactRepository.save).toHaveBeenCalledWith(longMessageContact);
    });

    it('should preserve all contact data fields correctly', async () => {
      // Arrange
      contactRepository.create?.mockReturnValue(mockContact);
      contactRepository.save?.mockResolvedValue(mockContact);

      // Act
      const result = await service.createContact(mockCreateContactDto);

      // Assert
      expect(result).toMatchObject({
        id: expect.any(String),
        name: mockCreateContactDto.name,
        email: mockCreateContactDto.email,
        enquiryType: mockCreateContactDto.enquiryType,
        message: mockCreateContactDto.message,
        createdAt: expect.any(Date),
      });
    });
  });
});
