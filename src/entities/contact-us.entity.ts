import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum EnquiryType {
  GENERAL_ENQUIRY = 'General enquiry',
  TECHNICAL_ENQUIRY = 'Technical enquiry',
  FEEDBACK = 'Feedback',
  PARTNERSHIP = 'Partnership',
  PRESS_AND_MEDIA = 'Press and media',
  OTHERS = 'Others',
}

@Entity('contacts')
export class Contact {
  @ApiProperty({
    description: 'Unique identifier for the contact message',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Name of the person contacting',
    example: 'John Doe',
    maxLength: 100,
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    description: 'Email address of the person contacting',
    example: 'john.doe@example.com',
    maxLength: 255,
  })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @ApiProperty({
    description: 'Type of enquiry',
    enum: EnquiryType,
    example: EnquiryType.GENERAL_ENQUIRY,
  })
  @Column({
    type: 'enum',
    enum: EnquiryType,
  })
  enquiryType: EnquiryType;

  @ApiProperty({
    description: 'Message content',
    example: 'I would like to know more about your services.',
  })
  @Column({ type: 'text' })
  message: string;

  @ApiProperty({
    description: 'Timestamp when the contact was created',
  })
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
