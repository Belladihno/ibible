import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { EnquiryType } from 'src/entities/contact-us.entity';

export class CreateContactDto {
  @ApiProperty({
    description: 'Name of the person contacting',
    example: 'John Doe',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name: string;

  @ApiProperty({
    description: 'Email address of the person contacting',
    example: 'john.doe@example.com',
    maxLength: 255,
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  email: string;

  @ApiProperty({
    description: 'Type of enquiry',
    enum: EnquiryType,
    example: EnquiryType.GENERAL_ENQUIRY,
  })
  @IsEnum(EnquiryType, { message: 'Invalid enquiry type' })
  @IsNotEmpty({ message: 'Enquiry type is required' })
  enquiryType: EnquiryType;

  @ApiProperty({
    description: 'Message content',
    example: 'I would like to know more about your services.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Message is required' })
  message: string;
}
