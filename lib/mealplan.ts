import { normalize } from './foods';
import { dislikedIn, likesIn } from './memory';
import { dayKey, roundMacros, sumMacros, uid } from './nutrition';
import { findRecipe, RECIPES, type RecipeEntry } from './recipes';
import type {
  Macros,
  MealLabel,
  MealPlan,
  MemoryNote,
  PlanDay,
  PlanFocus,
  PlannedMeal,
  Profile,
} from './types';

/**
 * Daily and weekly meal plans built from Nouri's recipes: four meals a day
 * sized to the user's targets, respecting diet, foods to avoid and memory
 * (dislikes are excluded, loved foods come up more often), with variety
 * across the week.
 */

export const PLAN_SLOTS: { label: MealLabel; share: number }[] = [
  { label: 'Colazione', share: 0.24 },
  { label: 'Pranzo', share: 0.34 },
  { label: 'Spuntino', share: 0.1 },
  { label: 'Cena', share: 0.32 },
];

export const focusLabels: Record<PlanFocus, string> = {
  balanced: 'Bilanciato',
  protein: 'Più proteine',
  quick: 'Veloce',
  light: 'Leggero',
};

export const focusHints: Record<PlanFocus, string> = {
  balanced: 'Calorie e macro del tuo piano',
  protein: 'Le ricette più proteiche',
  quick: 'Quasi tutto sotto i 20 minuti',
  light: 'Un po’ sotto le tue calorie',
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const textCache = new Map<string, string>();
export function recipeText(r: { title: string; ingredients?: string[] }): string {
  const key = `${r.title}|${r.ingredients?.length ?? 0}`;
  let t = textCache.get(key);
  if (!t) {
    t = normalize(`${r.title} ${(r.ingredients ?? []).join(' ')}`);
    textCache.set(key, t);
  }
  return t;
}

/** Recipes this user can be offered: diet, foods to avoid and dislikes from memory. */
export function recipePool(profile: Profile, memories: MemoryNote[]): RecipeEntry[] {
  return RECIPES.filter(
    (r) =>
      r.diets.includes(profile.diet) &&
      !r.avoidTags.some((a) => profile.avoid.includes(a)) &&
      !dislikedIn(recipeText(r), memories)
  );
}

const r1 = (n: number) => Math.round(n * 10) / 10;

function planned(r: RecipeEntry, label: MealLabel, servings: number): PlannedMeal {
  return {
    label,
    title: r.title,
    emoji: r.emoji,
    minutes: r.minutes,
    servings,
    kcal: Math.round(r.kcal * servings),
    protein: r1(r.protein * servings),
    carbs: r1(r.carbs * servings),
    fat: r1(r.fat * servings),
  };
}

function servingsFor(r: RecipeEntry, label: MealLabel, budget: number): number {
  if (label === 'Spuntino') return 1;
  return Math.min(1.5, Math.max(0.75, Math.round((budget / r.kcal) * 4) / 4));
}

interface PickState {
  used: Map<string, number>;
  lastDay: Map<string, number>;
}

interface SlotTarget {
  kcal: number;
  protein: number;
  fat: number;
}

function slotTarget(profile: Profile, label: MealLabel, factor = 1): SlotTarget {
  const share = PLAN_SLOTS.find((s) => s.label === label)?.share ?? 0.25;
  const T = profile.targets;
  return { kcal: T.kcal * share * factor, protein: T.protein * share, fat: T.fat * share * factor };
}

function pickFor(
  label: MealLabel,
  target: SlotTarget,
  opts: {
    pool: RecipeEntry[];
    memories: MemoryNote[];
    focus: PlanFocus;
    exclude: Set<string>;
    day: number;
    state: PickState;
    random: () => number;
  }
): { r: RecipeEntry; servings: number } | null {
  const { pool, memories, focus, exclude, day, state, random } = opts;
  const inSlot = pool.filter((r) => r.moments.includes(label) && !exclude.has(r.title));
  const list = inSlot.length ? inSlot : pool.filter((r) => !exclude.has(r.title));
  if (!list.length) return null;
  const best = list
    .map((r) => {
      const servings = servingsFor(r, label, target.kcal);
      const kcal = r.kcal * servings;
      const protein = r.protein * servings;
      const fat = r.fat * servings;
      // calories first, then protein close to its share, and no fat overshoot
      let score = -(Math.abs(kcal - target.kcal) / target.kcal) * 3;
      const p = protein / Math.max(1, target.protein);
      score -= Math.abs(1 - p) * (focus === 'protein' ? 0.6 : 1.4);
      if (focus === 'protein') score += Math.min(p, 1.6) * 1.2;
      score -= Math.max(0, fat / Math.max(1, target.fat) - 1) * 1.2;
      if (focus === 'quick') score -= Math.max(0, r.minutes - 15) / 6;
      if (focus === 'light') score -= (kcal / target.kcal) * 1.5;
      if (!inSlot.length) score -= 2;
      score += likesIn(recipeText(r), memories).length * 1.4;
      score -= (state.used.get(r.title) ?? 0) * 1.8;
      const last = state.lastDay.get(r.title);
      if (last !== undefined && day - last <= 1) score -= 2.5;
      score += random() * 1.4;
      return { r, servings, score };
    })
    .sort((a, b) => b.score - a.score)[0];
  return best ? { r: best.r, servings: best.servings } : null;
}

/** Nudges portions so the day lands within ~8% of the calorie target. */
function balanceDay(meals: PlannedMeal[], target: number): PlannedMeal[] {
  let out = meals;
  for (let pass = 0; pass < 3; pass++) {
    const total = out.reduce((a, m) => a + m.kcal, 0);
    const off = total / target;
    if (off > 0.92 && off < 1.08) break;
    const dir = off <= 0.92 ? 0.25 : -0.25;
    const idx = out
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => m.label !== 'Spuntino')
      .filter(({ m }) => (dir > 0 ? m.servings < 1.5 : m.servings > 0.75))
      .sort((a, b) => b.m.kcal - a.m.kcal)[0]?.i;
    if (idx === undefined) break;
    const m = out[idx];
    const r = RECIPES.find((x) => x.title === m.title);
    if (!r) break;
    out = out.map((x, i) => (i === idx ? planned(r, m.label, m.servings + dir) : x));
  }
  return out;
}

export function generatePlan(input: {
  profile: Profile;
  memories: MemoryNote[];
  kind: 'day' | 'week';
  focus?: PlanFocus;
  start?: Date;
  seed?: number;
}): MealPlan {
  const { profile, memories, kind } = input;
  const focus = input.focus ?? 'balanced';
  const start = input.start ?? new Date();
  const random = mulberry32(input.seed ?? Date.now());
  const pool = recipePool(profile, memories);
  const factor = focus === 'light' ? 0.92 : 1;
  const target = profile.targets.kcal * factor;
  const state: PickState = { used: new Map(), lastDay: new Map() };
  const days: PlanDay[] = [];

  for (let d = 0; d < (kind === 'week' ? 7 : 1); d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const exclude = new Set<string>();
    const meals: PlannedMeal[] = [];
    for (const slot of PLAN_SLOTS) {
      const pick = pickFor(slot.label, slotTarget(profile, slot.label, factor), {
        pool,
        memories,
        focus,
        exclude,
        day: d,
        state,
        random,
      });
      if (!pick) continue;
      exclude.add(pick.r.title);
      state.used.set(pick.r.title, (state.used.get(pick.r.title) ?? 0) + 1);
      state.lastDay.set(pick.r.title, d);
      meals.push(planned(pick.r, slot.label, pick.servings));
    }
    days.push({ date: dayKey(date), meals: balanceDay(meals, target) });
  }
  return { id: uid(), kind, focus, createdAt: new Date().toISOString(), days };
}

/** Replaces one meal with a different recipe for the same moment. */
export function swapPlannedMeal(
  plan: MealPlan,
  date: string,
  index: number,
  profile: Profile,
  memories: MemoryNote[]
): MealPlan {
  const day = plan.days.find((d) => d.date === date);
  const current = day?.meals[index];
  if (!day || !current) return plan;
  const state: PickState = { used: new Map(), lastDay: new Map() };
  plan.days.forEach((d, i) =>
    d.meals.forEach((m) => {
      state.used.set(m.title, (state.used.get(m.title) ?? 0) + 1);
      state.lastDay.set(m.title, i);
    })
  );
  const pick = pickFor(current.label, slotTarget(profile, current.label), {
    pool: recipePool(profile, memories),
    memories,
    focus: plan.focus,
    exclude: new Set(day.meals.map((m) => m.title)),
    day: plan.days.indexOf(day),
    state,
    random: mulberry32(Date.now()),
  });
  if (!pick) return plan;
  const next = planned(pick.r, current.label, pick.servings);
  return {
    ...plan,
    days: plan.days.map((d) =>
      d.date === date ? { ...d, meals: d.meals.map((m, i) => (i === index ? next : m)) } : d
    ),
  };
}

export function recipeForMeal(title: string): RecipeEntry | undefined {
  return RECIPES.find((r) => r.title === title) ?? findRecipe(title);
}

const AISLE_ORDER = [
  'Ortofrutta',
  'Macelleria',
  'Pescheria',
  'Salumeria',
  'Frigo',
  'Panetteria',
  'Dispensa',
  'Surgelati',
];

/** Shopping list for a plan, grouped by aisle (recipes Nouri doesn't know go under "Altro"). */
export function planGrocery(plan: MealPlan): { title: string; items: string[] }[] {
  const aisles: Record<string, Set<string>> = {};
  const other = new Set<string>();
  const seen = new Set<string>();
  for (const day of plan.days) {
    for (const m of day.meals) {
      const r = RECIPES.find((x) => x.title === m.title);
      if (!r) {
        other.add(m.title);
        continue;
      }
      for (const [aisle, items] of Object.entries(r.aisles)) {
        aisles[aisle] ??= new Set();
        for (const raw of items) {
          const it = raw.replace(/\s+\d+\s*g$/, '');
          // "Zucchina" and "Zucchine" are the same thing on a shopping list
          const key = normalize(it).replace(/[aeio]\b/g, '');
          if (!seen.has(key)) {
            seen.add(key);
            aisles[aisle].add(it);
          }
        }
      }
    }
  }
  const sections = Object.entries(aisles)
    .sort(([a], [b]) => (AISLE_ORDER.indexOf(a) + 1 || 99) - (AISLE_ORDER.indexOf(b) + 1 || 99))
    .map(([title, items]) => ({ title, items: [...items] }));
  if (other.size) sections.push({ title: 'Per gli altri piatti', items: [...other] });
  return sections;
}

export function planDayTotals(day: PlanDay): Macros {
  return roundMacros(sumMacros(day.meals));
}

export function servingsLabel(s: number): string {
  if (s === 1) return '1 porzione';
  const whole = Math.floor(s);
  const frac = { 0.25: '¼', 0.5: '½', 0.75: '¾' }[(s - whole) as 0.25 | 0.5 | 0.75] ?? '';
  return whole === 0 ? `${frac} di porzione` : `${whole}${frac} porzioni`;
}

const WEEKDAY = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const WEEKDAY_LONG = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MONTH = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dayChip(key: string): { weekday: string; day: number } {
  const d = parseDay(key);
  return { weekday: WEEKDAY[d.getDay()], day: d.getDate() };
}

/** "Oggi", "Domani", or "Giovedì 2 ott". */
export function dayName(key: string): string {
  const today = dayKey();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (key === today) return 'Oggi';
  if (key === dayKey(tomorrow)) return 'Domani';
  const d = parseDay(key);
  return `${WEEKDAY_LONG[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`;
}

export function planTitle(plan: MealPlan): string {
  if (plan.kind === 'day')
    return `Piano di ${dayName(plan.days[0]?.date ?? dayKey()).toLowerCase()}`;
  const first = parseDay(plan.days[0].date);
  const last = parseDay(plan.days[plan.days.length - 1].date);
  return `Settimana ${first.getDate()} ${MONTH[first.getMonth()]} – ${last.getDate()} ${MONTH[last.getMonth()]}`;
}

/** Key used to remember which planned meals were logged. */
export const planMealKey = (planId: string, date: string, index: number) =>
  `${planId}:${date}:${index}`;

/** The same dishes again, as a new plan starting on `start` (to reuse a plan you liked). */
export function redatePlan(plan: MealPlan, start: Date = new Date()): MealPlan {
  return {
    ...plan,
    id: uid(),
    createdAt: new Date().toISOString(),
    days: plan.days.map((d, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return { ...d, date: dayKey(date) };
    }),
  };
}

const WEEKDAY_WORDS = [
  'domenica',
  'lunedi',
  'martedi',
  'mercoledi',
  'giovedi',
  'venerdi',
  'sabato',
];

/**
 * The day a (normalized) message refers to: "oggi", "stasera", "domani",
 * "dopodomani" or a weekday name (the next one, today included).
 */
export function dayFromText(t: string, now: Date = new Date()): string | null {
  const d = new Date(now);
  if (/\bdopodomani\b/.test(t)) d.setDate(d.getDate() + 2);
  else if (/\bdomani\b/.test(t)) d.setDate(d.getDate() + 1);
  else {
    const w = WEEKDAY_WORDS.findIndex((name) => new RegExp(`\\b${name}\\b`).test(t));
    if (w !== -1) d.setDate(d.getDate() + ((w - d.getDay() + 7) % 7));
    else if (!/\b(oggi|stasera|stamattina|stamani)\b/.test(t)) return null;
  }
  return dayKey(d);
}

/** Compact text of a plan for Claude's context. */
export function planContext(plan: MealPlan): string {
  return plan.days
    .map(
      (d) =>
        `${dayName(d.date)}: ${d.meals.map((m) => `${m.label} ${m.title} (${m.kcal} kcal)`).join('; ')}`
    )
    .join('\n');
}
