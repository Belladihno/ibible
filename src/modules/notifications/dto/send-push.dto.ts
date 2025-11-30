import {
  IsString,
  IsUUID,
  IsBoolean,
  IsObject,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { NoticationCategory } from 'src/entities/notification-log.entity';

export class SendPushDto {
  @IsUUID()
  userId: string;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsEnum(NoticationCategory)
  category: NoticationCategory;

  @IsObject()
  @IsOptional()
  data?: {
    screen?: string;
    action?: string;
    [key: string]: any;
  };

  @IsBoolean()
  @IsOptional()
  scheduled?: boolean;
}
