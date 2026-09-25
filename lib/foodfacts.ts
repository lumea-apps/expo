import { capitalize, FOODS, normalize, type FoodEntry } from './foods';
import type { FoodFacts, FoodItem, Macros, Nutrients } from './types';

/**
 * Nutrition facts for the quick search: the built-in food table (instant,
 * offline) and helpers to scale any food to the grams actually eaten.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;

export function fromFoodEntry(f: FoodEntry): FoodFacts {
  const k = 100 / f.grams;
  return {
    id: `nouri:${f.key}`,
    name: capitalize(f.key),
    emoji: f.emoji,
    source: 'nouri',
    per100: {
      kcal: Math.round(f.kcal * k),
      protein: round1(f.protein * k),
      carbs: round1(f.carbs * k),
      fat: round1(f.fat * k),
    },
    portion: { label: f.portion, grams: f.grams },
  };
}

/** Instant results from the built-in table: name/alias prefix matches first. */
export function searchLocal(query: string, limit = 8): FoodFacts[] {
  const q = normalize(query);
  if (!q) return [];
  const scored: { f: FoodEntry; score: number }[] = [];
  for (const f of FOODS) {
    let best = 0;
    for (const alias of [f.key, ...f.aliases]) {
      const a = normalize(alias);
      if (a === q) best = Math.max(best, 5);
      else if (a.startsWith(q)) best = Math.max(best, 4 - a.length / 100);
      else if (a.split(' ').some((w) => w.startsWith(q))) best = Math.max(best, 3);
      else if (q.length >= 3 && a.includes(q)) best = Math.max(best, 2);
      else if (q.split(' ').length > 1 && q.includes(a) && a.length >= 4)
        best = Math.max(best, 1.5);
    }
    if (best > 0) scored.push({ f, score: best });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => fromFoodEntry(s.f));
}

/** Nutrition for the grams actually eaten. */
export function nutrientsFor(food: FoodFacts, grams: number): Nutrients {
  const k = grams / 100;
  const p = food.per100;
  const opt = (v?: number) => (v === undefined ? undefined : round1(v * k));
  return {
    kcal: Math.round(p.kcal * k),
    protein: round1(p.protein * k),
    carbs: round1(p.carbs * k),
    fat: round1(p.fat * k),
    fiber: opt(p.fiber),
    sugars: opt(p.sugars),
    satFat: opt(p.satFat),
    salt: opt(p.salt),
  };
}

export function toFoodItem(food: FoodFacts, grams: number): FoodItem {
  const n = nutrientsFor(food, grams);
  const m: Macros = { kcal: n.kcal, protein: n.protein, carbs: n.carbs, fat: n.fat };
  return {
    name: food.brand ? `${food.name} · ${food.brand}` : food.name,
    emoji: food.emoji,
    qty: grams === food.portion.grams ? `${food.portion.label}` : `${grams} g`,
    ...m,
  };
}
