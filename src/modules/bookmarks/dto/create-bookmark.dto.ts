import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateBookmarkDto {
  @ApiProperty({
    example: 'jesus wept',
    description: 'text of the bible verse',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    example: 'john3:16',
    description: 'Verse number to bookmark',
  })
  @IsNumber()
  @IsNotEmpty()
  verse: string;
}
