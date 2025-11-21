import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// Remove 'password' and 'authProvider' from updatable fields
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'authProvider'] as const),
) {}
