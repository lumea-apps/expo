import { Platform } from 'react-native';

import { capitalize, findFood, normalize } from './foods';
import type { FoodFacts } from './types';

/**
 * Packaged products from Open Food Facts (open database, no key), by name or
 * by barcode. Common foods come from the built-in table in `foodfacts.ts`.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;

// ——— Open Food Facts ———

const FIELDS =
  'code,product_name,product_name_it,brands,nutriments,serving_size,serving_quantity,quantity,image_small_url';
// Open Food Facts asks apps to identify themselves; browsers don't allow setting it.
const HEADERS: Record<string, string> =
  Platform.OS === 'web' ? {} : { 'User-Agent': 'Nouri/1.0 (Expo app; nutrition assistant)' };

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_it?: string;
  brands?: string | string[];
  quantity?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  image_small_url?: string;
  nutriments?: Record<string, number | string | undefined>;
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : undefined;
}

function grams(label?: string): number | undefined {
  const m = label?.match(/(\d+(?:[.,]\d+)?)\s*(g|gr|ml)\b/i);
  return m ? Number(m[1].replace(',', '.')) : undefined;
}

export function fromOff(p: OffProduct): FoodFacts | null {
  const n = p.nutriments ?? {};
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) ?? NaN) / 4.184;
  const name = (p.product_name_it || p.product_name || '').trim();
  if (!name || !Number.isFinite(kcal)) return null;
  const brand = (Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(',')[0])?.trim();
  const serving = num(p.serving_quantity);
  const pack = grams(p.quantity);
  const portion =
    serving && serving > 0 && serving < 1000
      ? { label: p.serving_size?.trim() || `${serving} g`, grams: Math.round(serving) }
      : pack && pack <= 250
        ? { label: `1 confezione · ${pack} g`, grams: Math.round(pack) }
        : { label: '100 g', grams: 100 };
  return {
    id: `off:${p.code ?? name}`,
    name: capitalize(name.length > 60 ? `${name.slice(0, 57)}…` : name),
    brand: brand || undefined,
    emoji: findFood(name)?.emoji ?? '🛒',
    image: p.image_small_url,
    source: 'off',
    per100: {
      kcal: Math.round(kcal),
      protein: round1(num(n['proteins_100g']) ?? 0),
      carbs: round1(num(n['carbohydrates_100g']) ?? 0),
      fat: round1(num(n['fat_100g']) ?? 0),
      fiber: num(n['fiber_100g']),
      sugars: num(n['sugars_100g']),
      satFat: num(n['saturated-fat_100g']),
      salt: num(n['salt_100g']),
    },
    portion,
  };
}

const cache = new Map<string, FoodFacts[]>();

/**
 * Packaged products by name. Native apps use the fast search service; browsers
 * use the classic endpoint, the one that allows cross-origin requests.
 */
export async function searchProducts(query: string, signal?: AbortSignal): Promise<FoodFacts[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  const url =
    Platform.OS === 'web'
      ? `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&lc=it&fields=${FIELDS}`
      : `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&langs=it&page_size=20&fields=${FIELDS}`;
  const res = await fetch(url, { headers: HEADERS, signal });
  if (!res.ok) throw new Error(`Open Food Facts ${res.status}`);
  const json = (await res.json()) as { hits?: OffProduct[]; products?: OffProduct[] };
  const seen = new Set<string>();
  const out = (json.hits ?? json.products ?? [])
    .map(fromOff)
    .filter((f): f is FoodFacts => {
      if (!f) return false;
      const id = `${normalize(f.name)}|${normalize(f.brand ?? '')}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 12);
  cache.set(key, out);
  return out;
}

/** A packaged product by barcode (EAN/UPC), or null if Open Food Facts doesn't know it. */
export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<FoodFacts | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`,
    { headers: HEADERS, signal }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts ${res.status}`);
  const json = (await res.json()) as { status?: number; product?: OffProduct };
  if (!json.product || json.status === 0) return null;
  return fromOff({ ...json.product, code });
}

export const isBarcode = (q: string) => /^\d{8,14}$/.test(q.trim());
