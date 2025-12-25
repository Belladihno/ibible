import { ChatRole } from '../enums';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};
