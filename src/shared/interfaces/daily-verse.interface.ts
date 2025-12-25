import { DailyVerseConversationMessage } from 'src/entities/daily-verse-conversation-message.entity';
import { ChatRole } from '../enums';

export interface ConversationMetadata {
  id: string;
  userId: string;
  verseReference: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageInfo {
  id: string;
  content: string;
  createdAt: Date;
}

export interface MessagePair {
  user: MessageInfo | null;
  assistant: MessageInfo | null;
}

export interface StartConversationResponse {
  conversation: ConversationMetadata;
  aiMessage: DailyVerseConversationMessage;
}

export interface PostMessageResponse {
  conversation: ConversationMetadata;
  messagePairs: MessagePair[];
}

export interface ConversationHistoryResponse {
  conversation: ConversationMetadata;
  messagePairs: MessagePair[];
}

export interface ConversationSummary {
  id: string;
  verseReference: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  messagePairs: MessagePair[];
  lastPair: MessagePair | null;
}

// export interface GeminiHistoryEntry {
//   role: string;
//   content: string;
// }
