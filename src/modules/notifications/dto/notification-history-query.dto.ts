import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationType,
  NotificationStatus,
} from 'src/entities/notification-log.entity';

export class NotificationHistoryQueryDto {
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus;

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  offset?: number;
}
