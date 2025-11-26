import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

export enum Testament {
  NEW = 'new',
  OLD = 'old',
}

@Entity('bible_books')
export class BibleBook {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', length: 100 })
  name: string;

  @Column({
    name: 'testament',
    type: 'enum',
    enum: Testament,
  })
  testament: Testament;

  @Column({ name: 'book_order' })
  bookOrder: number;

  @Column({ name: 'total_chapters' })
  totalChapters: number;

  @Column({
    name: 'abbreviation',
    length: 10,
    nullable: true,
  })
  abbreviation?: string;
}
