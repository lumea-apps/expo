import type { Activity, Goal, Macros, Meal, MealLabel, Targets } from './types';

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function computeTargets(goal: Goal, weight: number | null, activity: Activity): Targets {
  const kg = weight && weight > 30 && weight < 250 ? weight : 70;
  const perKg = activity === 'low' ? 28 : activity === 'medium' ? 31 : 35;
  const goalFactor = goal === 'lose' ? 0.85 : goal === 'gain' ? 1.1 : 1;
  const kcal = Math.round((kg * perKg * goalFactor) / 10) * 10;
  const proteinPerKg = goal === 'gain' ? 2 : goal === 'lose' ? 1.8 : 1.6;
  const protein = Math.round(kg * proteinPerKg);
  const fat = Math.round((kcal * 0.28) / 9);
  const carbs = Math.max(80, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const water = Math.round((kg * 35) / 250) * 250;
  return { kcal, protein, carbs, fat, water };
}

export function sumMacros<T extends Macros>(items: T[]): Macros {
  return items.reduce(
    (acc, it) => ({
      kcal: acc.kcal + it.kcal,
      protein: acc.protein + it.protein,
      carbs: acc.carbs + it.carbs,
      fat: acc.fat + it.fat,
    }),
    { ...ZERO }
  );
}

export function mealTotals(meal: { items: Macros[] }): Macros {
  return roundMacros(sumMacros(meal.items));
}

export function roundMacros(m: Macros): Macros {
  return {
    kcal: Math.round(m.kcal),
    protein: Math.round(m.protein),
    carbs: Math.round(m.carbs),
    fat: Math.round(m.fat),
  };
}

export function dayKey(d: Date | string = new Date()): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function mealsOn(meals: Meal[], key: string = dayKey()): Meal[] {
  return meals
    .filter((m) => dayKey(m.at) === key)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export function dayTotals(meals: Meal[], key: string = dayKey()): Macros {
  return roundMacros(sumMacros(mealsOn(meals, key).flatMap((m) => m.items)));
}

export function labelForTime(d: Date = new Date()): MealLabel {
  const h = d.getHours();
  if (h < 11) return 'Colazione';
  if (h < 15) return 'Pranzo';
  if (h >= 18) return 'Cena';
  return 'Spuntino';
}

export function greetingFor(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'Nottambulo';
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

export function lastSevenDays(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

const WEEKDAYS = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
export function weekdayLetter(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

export function formatKcal(n: number): string {
  return Math.round(n).toLocaleString('it-IT');
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const MONTHS = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];
const DAYS = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
export function formatDateStamp(d: Date = new Date()): string {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export const goalLabels: Record<Goal, string> = {
  lose: 'Perdere peso',
  energy: 'Più energia',
  gain: 'Mettere massa',
  maintain: 'Mangiare meglio',
};

export const dietLabels: Record<import('./types').Diet, string> = {
  omnivore: 'Onnivoro',
  vegetarian: 'Vegetariano',
  vegan: 'Vegano',
  pescatarian: 'Pescetariano',
};

export const activityLabels: Record<Activity, string> = {
  low: 'Poco',
  medium: 'Un po’',
  high: 'Tanto',
};
