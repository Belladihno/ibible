// We need to import this "decorator" to validate the email
import { IsEmail, IsNotEmpty } from 'class-validator';

// This is our DTO class
export class CreateWaitlistEntryDto {
  @IsEmail() // This decorator says the field *must* be a valid email
  @IsNotEmpty() // This decorator says the field *must not* be empty
  email: string;
}
