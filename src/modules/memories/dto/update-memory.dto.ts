import { PartialType } from '@nestjs/swagger';
import { CreateMemoryDto } from './create-memory.dto';

// PartialType preserves validation metadata from CreateMemoryDto
export class UpdateMemoryDto extends PartialType(CreateMemoryDto) {}
