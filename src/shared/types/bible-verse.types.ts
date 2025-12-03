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
  id?: string;
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

// New interfaces for AI features
export interface DailyVerseWithSummary {
  verse: BibleVerse;
  summary: string;
  verseId: string;
  timestamp: string; // ✅ Add this
}

export interface DailyVerseSummaryResponse {
  statusCode: number;
  message: string;
  success?: boolean;
  data: DailyVerseWithSummary;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  dailyVerseId: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}
