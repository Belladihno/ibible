import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateBookmarkDto {
  @ApiProperty({
    example: 'Joshua',
    description: 'Bible book name',
  })
  @IsString()
  @IsNotEmpty()
  book: string;

  @ApiProperty({
    example: 1,
    description: 'Chapter number of the verse to bookmark',
  })
  @IsNumber()
  @IsNotEmpty()
  chapter: number;

  @ApiProperty({
    example: 5,
    description: 'Verse number to bookmark',
  })
  @IsNumber()
  @IsNotEmpty()
  verse: number;
}
