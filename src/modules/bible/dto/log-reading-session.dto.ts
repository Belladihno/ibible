import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class LogReadingSessionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  bibleId: string;

  @IsString()
  @IsNotEmpty()
  book: string;

  @IsString()
  @IsNotEmpty()
  chapter: string;

  @IsString()
  @IsNotEmpty()
  verse: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  timestamp?: string;
}
