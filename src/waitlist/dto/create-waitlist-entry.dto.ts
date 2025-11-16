import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class CreateWaitlistEntryDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;
}
