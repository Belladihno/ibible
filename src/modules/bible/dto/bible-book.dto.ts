import { ApiProperty } from '@nestjs/swagger';

export class BibleBookDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Genesis' })
  name: string;

  @ApiProperty({ example: 'old', enum: ['old', 'new'] })
  testament: 'old' | 'new';

  @ApiProperty({ example: 1 })
  bookOrder: number;

  @ApiProperty({ example: 50 })
  totalChapters: number;

  @ApiProperty({ example: 'Gen' })
  abbreviation: string;

  @ApiProperty({ example: 'GEN' })
  externalId: string;

  @ApiProperty({ example: 'The First Book of Moses, called Genesis' })
  nameLong: string;
}
