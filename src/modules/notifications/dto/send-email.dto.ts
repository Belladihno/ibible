import {
  IsString,
  IsUUID,
  IsObject,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { NoticationCategory } from 'src/entities/notification-log.entity';

export class SendEmailDto {
  @IsUUID()
  userId: string;

  @IsString()
  template: string;

  @IsString()
  subject: string;

  @IsEnum(NoticationCategory)
  category: NoticationCategory;

  @IsObject()
  data: {
    userName?: string;
    verificationLink?: string;
    resetLink?: string;
    [key: string]: any;
  };

  @IsString()
  @IsOptional()
  recipientEmail?: string;
}
