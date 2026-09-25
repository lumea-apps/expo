import { normalize } from './foods';
import { RECIPES } from './recipes';
import type { GroceryItem, MealPlan } from './types';

/**
 * Shopping lists with quantities: recipe ingredients are parsed ("150 g
 * salmone", "2 uova", "Cetriolo, zenzero"), scaled by the servings in the
 * plan, added up across the week and grouped by aisle.
 */

type Unit =
  | 'g'
  | 'ml'
  | 'n'
  | 'spicchi'
  | 'cucchiai'
  | 'cucchiaini'
  | 'fette'
  | 'manciate'
  | 'mazzetti';

interface Part {
  name: string;
  amount?: number;
  unit?: Unit;
}

const UNIT_WORDS: [RegExp, Unit][] = [
  [/^spicchi[oa]?$/, 'spicchi'],
  [/^cucchiai[on]?$/, 'cucchiai'],
  [/^cucchiain[oi]$/, 'cucchiaini'],
  [/^fett[ae]$/, 'fette'],
  [/^manciat[ae]$/, 'manciate'],
];

const UNIT_LABEL: Record<Unit, [string, string]> = {
  g: ['g', 'g'],
  ml: ['ml', 'ml'],
  n: ['', ''],
  spicchi: ['spicchio', 'spicchi'],
  cucchiai: ['cucchiaio', 'cucchiai'],
  cucchiaini: ['cucchiaino', 'cucchiaini'],
  fette: ['fetta', 'fette'],
  manciate: ['manciata', 'manciate'],
  mazzetti: ['mazzetto', 'mazzetti'],
};

const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75 };

// descriptors that don't matter when shopping
const DROP =
  /\s+(a cubetti|a fette|a rondelle|a crudo|congelat[aoie]|matur[aoie]|tostat[aoie]|abbattut[aoie]|cott[aoie]|novell[aoie]|surgelat[aoie]|sgusciat[aoie]|compatt[aoie]|freschi|fresche|\d+%)$/i;

const ALIASES: Record<string, string> = {
  soia: 'Salsa di soia',
  'sovracosce o petto di pollo': 'Petto di pollo',
  'skyr o yogurt greco': 'Yogurt greco',
  'filetto di salmone': 'Salmone',
  'scaglie di grana': 'Grana',
  'scaglie di ricotta salata': 'Ricotta salata',
};

function clean(raw: string): string {
  let s = raw
    .replace(/\([^)]*\)/g, '')
    .replace(/^(un filo di|un pizzico di|scaglie di)\s+/i, '')
    .replace(/[’']/g, '’')
    .trim();
  while (DROP.test(s)) s = s.replace(DROP, '').trim();
  const alias = ALIASES[normalize(s)];
  if (alias) return alias;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "1 spicchio d’aglio" → { name: 'Aglio', amount: 1, unit: 'spicchi' }; "Cetriolo, zenzero" → two parts. */
export function parseIngredient(line: string): Part[] {
  const out: Part[] = [];
  for (const piece of line.split(/,\s*|\s+e\s+/)) {
    const p = piece.trim();
    if (!p) continue;
    const m = p.match(/^(\d+(?:[.,]\d+)?|½|¼|¾)\s*(g|gr|ml|kg|l)?\s+(.+)$/i);
    if (!m) {
      out.push({ name: clean(p) });
      continue;
    }
    const amount = FRACTIONS[m[1]] ?? Number(m[1].replace(',', '.'));
    const unitRaw = m[2]?.toLowerCase();
    let rest = m[3];
    if (unitRaw) {
      const grams = unitRaw === 'kg' ? amount * 1000 : unitRaw === 'l' ? amount * 1000 : amount;
      out.push({
        name: clean(rest.replace(/^di\s+/i, '')),
        amount: grams,
        unit: unitRaw === 'ml' || unitRaw === 'l' ? 'ml' : 'g',
      });
      continue;
    }
    const [first, ...more] = rest.split(' ');
    const unit = UNIT_WORDS.find(([re]) => re.test(first.toLowerCase()))?.[1];
    if (unit)
      rest = more
        .join(' ')
        .replace(/^(di|d’|d')\s*/i, '')
        .replace(/^d’/i, '');
    out.push({ name: clean(rest), amount, unit: unit ?? 'n' });
  }
  return out;
}

const PLURAL: Record<string, string> = {
  uovo: 'Uova',
  mela: 'Mele',
  banana: 'Banane',
  zucchina: 'Zucchine',
  limone: 'Limoni',
  cipolla: 'Cipolle',
  piadina: 'Piadine integrali',
  'piadina integrale': 'Piadine integrali',
  mango: 'Manghi',
  peperone: 'Peperoni',
};

/**
 * Recipes often list fresh produce without a quantity ("Cetriolo, carote"):
 * a typical amount per dish keeps the list useful at the shop.
 */
const PER_DISH: [RegExp, number, Unit][] = [
  [/^(basilico|menta|prezzemolo|aneto|rosmarino|timo fresco)\b/, 1 / 3, 'mazzetti'],
  [/^cetriol/, 0.5, 'n'],
  [/^carot/, 1, 'n'],
  [/^sedano/, 1, 'n'],
  [/^zucchin/, 1, 'n'],
  [/^melanzan/, 0.5, 'n'],
  [/^peperon[ei]$/, 0.5, 'n'],
  [/^pomodoro$/, 1, 'n'],
  [/^cipolla$/, 0.5, 'n'],
  [/^cipollotto/, 1, 'n'],
  [/^scalogno/, 1, 'n'],
  [/^(limone|lime)$/, 0.5, 'n'],
  [/^lattuga/, 60, 'g'],
  [/^rucola/, 30, 'g'],
  [/^spinaci/, 80, 'g'],
  [/^cavolo/, 80, 'g'],
  [/^fragole/, 150, 'g'],
  [/^(frutti di bosco|frutti rossi)/, 100, 'g'],
  [/^lamponi/, 80, 'g'],
  [/^zenzero/, 10, 'g'],
  [/^aglio/, 1, 'spicchi'],
];

// ——— aisles ———

const AISLES: [string, RegExp][] = [
  ['Pescheria', /\b(salmone|tonno fresco|merluzzo|gamberi|orata|branzino|pesce)\b/],
  ['Macelleria', /\b(pollo|manzo|tacchino|controfiletto|vitello|carne|sovracosce)\b/],
  ['Salumeria', /\b(bresaola|prosciutto)\b/],
  [
    'Dispensa',
    /\b(tonno al naturale|burro d.?arachidi|burro di mandorle|salsa|passata|brodo|fagioli (rossi|borlotti)|ceci|lenticchie|pasta|riso|farro|orzo|quinoa|couscous|fiocchi|farina|granola|gallette|semi|sesamo|olio|aceto|capperi|olive|miele|cacao|mandorle|latte di cocco|cumino|curcuma|paprika|curry|cannella|pepe|sale|origano|peperoncino|tahina)\b/,
  ],
  ['Surgelati', /\b(edamame|minestrone)\b/],
  [
    'Frigo',
    /\b(yogurt|skyr|latte|uov[oa]|feta|ricotta|mozzarella|parmigiano|grana|tofu|tempeh|hummus|bevanda|burro|panna)\b/,
  ],
  ['Panetteria', /\b(pane|piadin[ae])\b/],
];

const ORDER = [
  'Ortofrutta',
  'Macelleria',
  'Pescheria',
  'Salumeria',
  'Frigo',
  'Panetteria',
  'Dispensa',
  'Surgelati',
];

// staples most kitchens already have: listed apart, without quantities
const PANTRY =
  /^(olio|sale|pepe|aceto|cannella|curcuma|paprika|cumino|curry|origano|timo|peperoncino|miele|salsa di soia|sesamo|capperi)\b/;

function aisleOf(name: string): string {
  const n = normalize(name);
  return AISLES.find(([, re]) => re.test(n))?.[0] ?? 'Ortofrutta';
}

// ——— adding up ———

interface Acc {
  name: string;
  amounts: Partial<Record<Unit, number>>;
  meals: Set<string>;
  days: Set<string>;
}

const keyOf = (name: string) =>
  normalize(name)
    .split(' ')
    .map((w) => (w.length > 3 ? w.replace(/[aeio]$/, '') : w))
    .join(' ');

function fmtCount(n: number): string {
  const whole = Math.floor(n);
  const frac = { 0.25: '¼', 0.5: '½', 0.75: '¾' }[(n - whole) as 0.25 | 0.5 | 0.75] ?? '';
  return whole === 0 ? frac || '0' : `${whole}${frac}`;
}

function fmtAmount(unit: Unit, v: number): string {
  if (unit === 'g' || unit === 'ml') {
    const big = unit === 'g' ? 'kg' : 'l';
    if (v >= 1000) return `${(Math.round(v / 100) / 10).toLocaleString('it-IT')} ${big}`;
    const step = v >= 100 ? 10 : 5;
    return `${Math.max(step, Math.round(v / step) * step)} ${unit}`;
  }
  // you buy whole eggs and bananas; a half avocado stays a half
  const n =
    unit === 'mazzetti'
      ? Math.max(1, Math.ceil(v - 0.01))
      : v >= 1
        ? Math.ceil(v - 0.01)
        : Math.ceil(v * 2) / 2;
  const [one, many] = UNIT_LABEL[unit];
  return unit === 'n' ? fmtCount(n) : `${fmtCount(n)} ${n > 1 ? many : one}`;
}

const DAY = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

/** Dishes to shop for: recipe title, servings, and the day it's planned (optional). */
export interface ShopFor {
  title: string;
  servings: number;
  date?: string;
}

export function groceryFor(list: ShopFor[]): { title: string; items: GroceryItem[] }[] {
  const acc = new Map<string, Acc>();
  const unknown = new Set<string>();
  for (const dish of list) {
    const r = RECIPES.find((x) => x.title === dish.title);
    if (!r) {
      unknown.add(dish.title);
      continue;
    }
    for (const line of r.ingredients) {
      for (const part of parseIngredient(line)) {
        const k = keyOf(part.name);
        const a = acc.get(k) ?? { name: part.name, amounts: {}, meals: new Set(), days: new Set() };
        const guess = part.amount ? null : PER_DISH.find(([re]) => re.test(normalize(part.name)));
        if (part.amount && part.unit) {
          a.amounts[part.unit] = (a.amounts[part.unit] ?? 0) + part.amount * dish.servings;
        } else if (guess) {
          a.amounts[guess[2]] = (a.amounts[guess[2]] ?? 0) + guess[1];
        }
        a.meals.add(`${dish.title}|${dish.date ?? ''}`);
        if (dish.date) {
          const [y, m, d] = dish.date.split('-').map(Number);
          a.days.add(DAY[new Date(y, m - 1, d).getDay()]);
        }
        acc.set(k, a);
      }
    }
  }

  const byAisle: Record<string, GroceryItem[]> = {};
  const pantry: GroceryItem[] = [];
  for (const a of acc.values()) {
    const units = Object.entries(a.amounts) as [Unit, number][];
    const count = a.amounts.n ?? 0;
    const name = count > 1 && PLURAL[normalize(a.name)] ? PLURAL[normalize(a.name)] : a.name;
    const qty = units.length ? units.map(([u, v]) => fmtAmount(u, v)).join(' + ') : 'q.b.';
    const uses = a.meals.size;
    const days = [...a.days];
    const note =
      uses > 1
        ? `${uses} pasti${days.length ? ` · ${days.slice(0, 4).join(', ')}${days.length > 4 ? '…' : ''}` : ''}`
        : days.length
          ? days[0]
          : undefined;
    const item: GroceryItem = { name, qty, note };
    if (PANTRY.test(normalize(a.name))) pantry.push({ name, qty });
    else (byAisle[aisleOf(a.name)] ??= []).push(item);
  }

  const sections = Object.entries(byAisle)
    .sort(([a], [b]) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99))
    .map(([title, items]) => ({
      title,
      // things with a quantity first, then the q.b. ones, alphabetical inside
      items: items.sort(
        (x, y) =>
          Number(x.qty === 'q.b.') - Number(y.qty === 'q.b.') || x.name.localeCompare(y.name, 'it')
      ),
    }));
  if (pantry.length)
    sections.push({
      title: 'Da controllare in dispensa',
      items: pantry.sort((x, y) => x.name.localeCompare(y.name, 'it')),
    });
  if (unknown.size)
    sections.push({
      title: 'Per gli altri piatti',
      items: [...unknown].map((t) => ({ name: t, note: 'ingredienti da decidere' })),
    });
  return sections;
}

/** Shopping list for the days of a plan still to come (today included). */
export function planGrocery(
  plan: MealPlan,
  from?: string
): { title: string; items: GroceryItem[] }[] {
  return groceryFor(
    plan.days
      .filter((d) => !from || d.date >= from)
      .flatMap((d) => d.meals.map((m) => ({ title: m.title, servings: m.servings, date: d.date })))
  );
}

/** How a list entry is stored in chat: old lists are plain strings. */
export function entryOf(e: string | GroceryItem): GroceryItem {
  return typeof e === 'string' ? { name: e } : e;
}

/** Key for "already bought": the same item keeps its tick across lists of the same plan. */
export function boughtKey(scope: string, name: string): string {
  return `${scope}:${keyOf(name)}`;
}
