import type {
  AssistantTurn,
  ChatMessage,
  Meal,
  MealPlan,
  MemoryNote,
  MemoryOps,
  PlanPrefs,
  Profile,
  ProfilePatch,
  Shortcut,
} from '../types';

export interface BrainContext {
  profile: Profile;
  meals: Meal[];
  waterToday: number;
  /** Conversation so far, oldest first, excluding the message being answered. */
  history: ChatMessage[];
  memoryOn: boolean;
  /** What Nouri remembers (empty when memory is off). */
  memories: MemoryNote[];
  shortcuts: Shortcut[];
  plan: MealPlan | null;
  /** Plans replaced by newer ones, newest first (for "riusa il piano precedente"). */
  pastPlans: MealPlan[];
  /** Default duration and style when the user asks for a plan without saying. */
  planPrefs: PlanPrefs;
}

export interface UserInput {
  text: string;
  image?: { uri: string; base64?: string | null; mimeType?: string | null };
}

export interface BrainReply extends AssistantTurn {
  /** Water the user said they drank in this message (ml), applied by the client. */
  waterMl: number;
  /** Plan changes requested in this message, applied by the client. */
  profilePatch?: ProfilePatch;
  /** Memory changes requested in this message, applied by the client. */
  memory?: MemoryOps;
  /** Set for shortcuts: the first meal card is logged right away. */
  autoLog?: { shortcutId: string };
  engine: 'claude' | 'local';
  /** Set when Claude was configured but unreachable and the local brain answered instead. */
  degraded?: boolean;
}
