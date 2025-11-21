import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BibleVerse } from './bible-verse.entity';

@Entity('bible_books')
@Index(['testament', 'bookOrder'])
export class BibleBook {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 10 })
  testament: 'old' | 'new';

  @Column({ name: 'book_order' })
  bookOrder: number;

  @Column({ name: 'total_chapters' })
  totalChapters: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  abbreviation: string;

  // eslint-disable-next-line prettier/prettier
  @Column({ name: 'external_id', type: 'varchar', length: 10, nullable: true, unique: true })
  externalId: string; // The ID from the external API (e.g., "GEN", "MAT")

  @Column({ name: 'name_long', type: 'varchar', length: 200, nullable: true })
  nameLong: string;

  @OneToMany(() => BibleVerse, (verse) => verse.book)
  verses: BibleVerse[];
}
