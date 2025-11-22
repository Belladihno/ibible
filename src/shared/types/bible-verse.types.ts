export interface BibleTranslation {
  identifier: string;
  name: string;
  language: string;
  language_code: string;
  license: string;
}

export interface RandomVerse {
  book_id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleApiResponse {
  translation: BibleTranslation;
  random_verse: RandomVerse;
}

export interface BibleVerse {
  reference: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: BibleTranslation;
}

export interface DailyVerseResponse {
  success: boolean;
  data: BibleVerse;
}

export interface RefreshVerseResponse {
  success: boolean;
  message: string;
  data: BibleVerse;
}
