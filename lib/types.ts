export type Goal = 'lose' | 'energy' | 'gain' | 'maintain';
export type Diet = 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian';
export type Activity = 'low' | 'medium' | 'high';
export type MealLabel = 'Colazione' | 'Pranzo' | 'Cena' | 'Spuntino';

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Targets extends Macros {
  water: number; // ml
}

export interface Profile {
  name: string;
  goal: Goal;
  diet: Diet;
  avoid: string[];
  weight: number | null;
  activity: Activity;
  targets: Targets;
  createdAt: string;
}

export interface FoodItem extends Macros {
  name: string;
  emoji: string;
  qty: string;
  /** 0..1 — how sure the estimate is (photo / free-text parsing). */
  confidence?: number;
}

export interface MealDraft {
  title: string;
  emoji: string;
  label: MealLabel;
  items: FoodItem[];
}

export interface Meal extends MealDraft {
  id: string;
  at: string; // ISO timestamp
  source: 'chat' | 'photo' | 'recipe';
}

export interface Recipe {
  title: string;
  emoji: string;
  minutes: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  tagline: string;
  ingredients: string[];
  steps: string[];
}

export interface Idea {
  title: string;
  emoji: string;
  kcal: number;
  protein: number;
  minutes: number;
  tagline: string;
}

export interface SwapFood {
  name: string;
  emoji: string;
  kcal: number;
  protein: number;
}

/**
 * Generative UI blocks the assistant can place in the conversation.
 * Both the local demo brain and Claude produce exactly these shapes.
 */
export type Widget =
  | { type: 'meal_log'; meal: MealDraft }
  | { type: 'macros' }
  | { type: 'recipe'; recipe: Recipe }
  | { type: 'ideas'; ideas: Idea[] }
  | { type: 'insight'; tone: 'positive' | 'neutral' | 'warning'; title: string; body: string }
  | { type: 'water' }
  | { type: 'grocery'; sections: { title: string; items: string[] }[] }
  | { type: 'week' }
  | { type: 'swap'; from: SwapFood; to: SwapFood; reason: string };

export interface AssistantTurn {
  text: string;
  widgets: Widget[];
  suggestions: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: string;
  imageUri?: string;
  widgets?: Widget[];
  suggestions?: string[];
  engine?: 'claude' | 'local';
}
