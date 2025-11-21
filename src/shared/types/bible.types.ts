export interface ExternalBibleBook {
  id: string;
  bibleId: string;
  abbreviation: string;
  name: string;
  nameLong: string;
}

export interface ExternalBibleBooksResponse {
  data: ExternalBibleBook[];
}
