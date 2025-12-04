export interface HistoryItemMetadata {
  // For meditation
  verseReference?: string;
  completed?: boolean;
  durationSeconds?: number;

  // For prayer
  prayerType?: string;
  status?: string;
  hasAIPrayer?: boolean;

  // For memory
  tags?: string[];
  verseRefs?: string[];
  aiRephraseStatus?: string;
}

export interface HistoryItem {
  id: string;
  type: 'chat' | 'meditation' | 'prayer' | 'memory';
  title: string;
  lastActivity: Date;
  preview: string;
  messageCount: number;
  createdAt: Date;
  metadata: HistoryItemMetadata;
}

export interface HistoryResponse {
  history: HistoryItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
