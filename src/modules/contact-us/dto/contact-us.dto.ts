import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EnquiryType } from 'src/entities/contact-us.entity';

export class CreateContactDto {
  @ApiProperty({
    description: 'Name of the person contacting',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @ApiProperty({
    description: 'Email address of the person contacting',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @ApiProperty({
    description: 'Type of enquiry',
    enum: EnquiryType,
    example: EnquiryType.GENERAL_ENQUIRY,
  })
  @IsEnum(EnquiryType, {
    message: 'Enquiry type must be one of the valid options',
  })
  @IsNotEmpty({ message: 'Enquiry type is required' })
  enquiryType: EnquiryType;

  @ApiProperty({
    description: 'Message content',
    example: 'I would like to know more about your services.',
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Message is required' })
  @MinLength(10, { message: 'Message must be at least 10 characters long' })
  @MaxLength(5000, { message: 'Message must not exceed 5000 characters' })
  message: string;
}

export class ContactResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the contact message',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the person contacting',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Email address of the person contacting',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Type of enquiry',
    enum: EnquiryType,
    example: EnquiryType.GENERAL_ENQUIRY,
  })
  enquiryType: EnquiryType;

  @ApiProperty({
    description: 'Message content',
    example: 'I would like to know more about your services.',
  })
  message: string;

  @ApiProperty({
    description: 'Timestamp when the contact was created',
  })
  createdAt: Date;
}
