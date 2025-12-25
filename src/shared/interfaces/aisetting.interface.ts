import { ALERT, UserTone, Voice } from 'src/modules/user/enums/user.enums';
import { ChatMessage } from '../types/chat.types';

export interface AiSettings {
  tone: UserTone;
  voice: Voice;
  alerts: ALERT;
  follow_up: boolean;
}

export interface user_preferences {
  preferred_translator: string;
  scripture_frequency: string;
  microphone: boolean;
}

export interface GeminiApiResponse {
  choices: { message: { content: string } }[];
}

export interface GeminiOptions {
  systemPrompt?: string;
  history?: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}
