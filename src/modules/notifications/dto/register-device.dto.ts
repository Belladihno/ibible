import { IsString, IsEnum, IsOptional } from 'class-validator';
import { DevicePlatform } from 'src/entities/device-token.entity';

export class RegisterDeviceDto {
  @IsString()
  token: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @IsString()
  @IsOptional()
  deviceInfo?: string;
}
