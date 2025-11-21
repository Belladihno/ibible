// src/bible/entities/bible-verse.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { BibleBook } from './bible-book.entity';

@Entity('bible_verses')
@Unique(['bookId', 'chapter', 'verse', 'version'])
@Index(['bookId', 'chapter', 'verse'])
@Index(['version'])
export class BibleVerse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'book_id' })
  bookId: number;

  @Column({ type: 'int' })
  chapter: number;

  @Column({ type: 'int' })
  verse: number;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'varchar', length: 10, default: 'KJV' })
  version: string;

  // For full-text search (PostgreSQL tsvector)
  @Column({
    name: 'text_search',
    type: 'tsvector',
    nullable: true,
    select: false, // Don't select by default to save bandwidth
  })
  textSearch: string;

  // Relationship with BibleBook
  @ManyToOne(() => BibleBook, (book) => book.verses, {
    onDelete: 'CASCADE',
    eager: false, // Load manually when needed
  })
  @JoinColumn({ name: 'book_id' })
  book: BibleBook;

  // Optional: Add timestamps if you want to track when verses were added/updated
  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    select: false,
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    select: false,
  })
  updatedAt: Date;
}
