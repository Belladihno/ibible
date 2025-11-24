// Types used by the Bible module (responses from API.Bible)
export type PassageContentNode = {
  name?: string;
  type?: string;
  attrs?: Record<string, unknown>;
  text?: string;
  items?: PassageContentNode[];
};

export type PassageResponse = {
  data: {
    id: string;
    orgId?: string;
    bibleId?: string;
    bookId?: string;
    chapterIds?: string[];
    reference?: string;
    content?: PassageContentNode[];
  };
};

export type VerseResponse = {
  data: {
    id: string;
    orgId?: string;
    bibleId?: string;
    bookId?: string;
    chapterId?: string;
    chapterIds?: string[];
    reference?: string;
    content?: PassageContentNode[];
    verseCount?: number;
    next?: { id: string; number?: string };
    previous?: { id: string; number?: string };
    timestamp?: string;
    copyright?: string;
  };
};
