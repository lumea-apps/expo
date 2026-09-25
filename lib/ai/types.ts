import type { AssistantTurn, ChatMessage, Meal, Profile } from '../types';

export interface BrainContext {
  profile: Profile;
  meals: Meal[];
  waterToday: number;
  /** Conversation so far, oldest first, excluding the message being answered. */
  history: ChatMessage[];
}

export interface UserInput {
  text: string;
  image?: { uri: string; base64?: string | null; mimeType?: string | null };
}

export interface BrainReply extends AssistantTurn {
  /** Water the user said they drank in this message (ml), applied by the client. */
  waterMl: number;
  engine: 'claude' | 'local';
  /** Set when Claude was configured but unreachable and the local brain answered instead. */
  degraded?: boolean;
}
