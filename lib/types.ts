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

/** Onboarding answers saved step by step, so an interrupted onboarding resumes where it was. */
export interface OnboardingDraft {
  step: 'name' | 'goal' | 'diet' | 'avoid' | 'weight' | 'activity';
  name: string;
  goal: Goal;
  diet: Diet;
  avoid: string[];
  weight: string;
  activity: Activity;
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
  source: 'chat' | 'photo' | 'recipe' | 'search' | 'plan' | 'shortcut';
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

// ——— memory ———

/** like / dislike = foods; note = a habit or preference ("a pranzo mangio in mensa"). */
export type MemoryKind = 'like' | 'dislike' | 'note';

export interface MemoryNote {
  id: string;
  kind: MemoryKind;
  text: string;
  at: string;
}

/** A remembered meal the user can log in one tap or by name ("la solita colazione"). */
export interface Shortcut {
  id: string;
  name: string;
  meal: MealDraft;
  at: string;
  uses: number;
}

/** What the memory card in chat confirms: new notes, forgotten ones, a saved shortcut. */
export interface MemoryChange {
  kind: MemoryKind | 'shortcut' | 'forget';
  text: string;
}

// ——— food facts (quick search, barcode) ———

export interface Nutrients extends Macros {
  fiber?: number;
  sugars?: number;
  satFat?: number;
  salt?: number;
}

export interface FoodFacts {
  /** Stable id: `nouri:<key>` for the built-in table, `off:<barcode>` for products. */
  id: string;
  name: string;
  brand?: string;
  emoji: string;
  image?: string;
  source: 'nouri' | 'off' | 'claude';
  per100: Nutrients;
  /** A typical portion ("1 vasetto", 170 g). */
  portion: { label: string; grams: number };
}

// ——— shopping ———

export interface GroceryItem {
  name: string;
  /** "300 g", "4", "2 fette", "q.b." */
  qty?: string;
  /** Where it's used: "3 pasti · lun, mer, ven". */
  note?: string;
}

// ——— meal plan ———

export type PlanFocus = 'balanced' | 'protein' | 'quick' | 'light';

export interface PlannedMeal extends Macros {
  label: MealLabel;
  title: string;
  emoji: string;
  minutes: number;
  /** Servings of the recipe (1 = the recipe as written). */
  servings: number;
}

export interface PlanDay {
  date: string; // day key
  meals: PlannedMeal[];
}

/** How the user likes plans made when they don't say: remembered from the last choice. */
export interface PlanPrefs {
  kind: 'day' | 'week';
  focus: PlanFocus;
}

export interface MealPlan {
  id: string;
  kind: 'day' | 'week';
  focus: PlanFocus;
  createdAt: string;
  days: PlanDay[];
}

// ——— training (optional module) ———

export type TrainingGoal = 'strength' | 'muscle' | 'fat_loss' | 'fitness';

export interface TrainingSetup {
  goal: TrainingGoal;
  level: 1 | 2 | 3;
  /** Sessions per week, 2–6. */
  days: number;
  equipment: 'none' | 'home' | 'gym';
  /** Minutes per session. */
  minutes: 20 | 30 | 45 | 60;
}

export interface WorkoutExercise {
  /** Catalogue id, or empty for exercises Claude named that the catalogue doesn't have. */
  id: string;
  name: string;
  sets: number;
  /** "8–12", "30 s", "10 min". */
  reps: string;
  /** Rest between sets, seconds. */
  rest: number;
  note?: string;
}

export interface WorkoutSession {
  id: string; // "A", "B", …
  name: string;
  /** Muscles worked, for the card ("Gambe, petto, schiena"). */
  focus: string;
  /** Day of the week, 0 = Sunday … 6 = Saturday. */
  weekday: number;
  minutes: number;
  exercises: WorkoutExercise[];
}

/** A weekly routine ("scheda"): the same sessions every week. */
export interface WorkoutPlan {
  id: string;
  createdAt: string;
  setup: TrainingSetup;
  sessions: WorkoutSession[];
}

export interface WorkoutLog {
  id: string;
  date: string; // day key
  planId: string;
  sessionId: string;
  name: string;
  minutes: number;
  kcal: number;
}

/** An exercise explained, as shown in chat. */
export interface ExerciseCard {
  id: string;
  name: string;
  muscles: string[];
  equipment: string[];
  level?: number;
  steps: string[];
  tips: string[];
  mistakes: string[];
  /** "3 × 10–12" suggestion. */
  dose?: string;
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
  | {
      type: 'grocery';
      /** Plain strings in older chats; items with quantities since. */
      sections: { title: string; items: (string | GroceryItem)[] }[];
      /** Set for a plan's list: ticks are shared with the Piano pasti screen. */
      planId?: string;
    }
  | { type: 'week' }
  | { type: 'swap'; from: SwapFood; to: SwapFood; reason: string }
  | { type: 'targets'; before: Targets; after: Targets; changes: string[] }
  | { type: 'meal_plan'; plan: MealPlan }
  | { type: 'food_facts'; food: FoodFacts }
  | { type: 'memory'; changes: MemoryChange[]; recall?: boolean }
  | { type: 'workout_plan'; plan: WorkoutPlan; sessionId?: string }
  | { type: 'exercise'; exercise: ExerciseCard }
  | { type: 'exercises'; title: string; items: { id: string; name: string; muscles: string[] }[] };

/** A change to the user's plan requested in conversation ("voglio mettere massa"). */
export interface ProfilePatch {
  goal?: Goal;
  diet?: Diet;
  weight?: number;
  activity?: Activity;
  avoidAdd?: string[];
  avoidRemove?: string[];
  /** Multiplies the current protein / calorie target (e.g. 1.15 = +15%). */
  proteinFactor?: number;
  kcalFactor?: number;
}

export interface AssistantTurn {
  text: string;
  widgets: Widget[];
  suggestions: string[];
}

/** Memory updates requested in a message, applied by the client (like plan changes). */
export interface MemoryOps {
  add?: { kind: MemoryKind; text: string }[];
  forget?: string[];
  shortcut?: { name: string; meal: MealDraft };
}

/** One conversation in the side menu. */
export interface Thread {
  id: string;
  title: string;
  /** false once the user renamed it: automatic titles stop there. */
  autoTitle: boolean;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
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
