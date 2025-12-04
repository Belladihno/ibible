import { ALERT, UserTone, Voice } from 'src/modules/user/enums/user.enums';

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
