import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('emotion_verse_mappings')
@Index(['emotion', 'relevanceScore'])
export class EmotionVerseMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  @Index('idx_emotion_verse_mappings_emotion')
  emotion: string;

  @Column({ name: 'book' })
  book: string;

  @Column({ name: 'chapter' })
  chapter: number;

  @Column({ name: 'verse' })
  verse: number;

  @Column({ name: 'verse_text', type: 'text' })
  verseText: string;

  @Column({ name: 'relevance_score', type: 'float', default: 1.0 })
  relevanceScore: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
