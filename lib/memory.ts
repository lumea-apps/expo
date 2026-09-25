import { normalize } from './foods';
import type { MemoryKind, MemoryNote, MemoryOps, Shortcut } from './types';

/**
 * Nouri's memory: foods you love or dislike, habits worth knowing, and
 * shortcuts (a named meal you log in one tap or by saying its name).
 * This module parses memory requests from chat and matches memories against
 * recipes, so ideas and meal plans respect them.
 */

// ——— parsing ———

/** Lowercase and strip accents one character at a time, so indices still map to the raw text. */
function fold(raw: string): string {
  const out = Array.from(raw, (ch) => {
    const c = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return c.length === 1 ? c.replace(/[’']/, ' ') : ch;
  }).join('');
  return out.length === raw.length ? out : raw.toLowerCase();
}

/** Returns the raw (accented, original-case) text of `capture`, found inside the folded string. */
function rawCapture(raw: string, folded: string, m: RegExpMatchArray, group = 1): string {
  const cap = m[group] ?? '';
  const start = (m.index ?? 0) + m[0].lastIndexOf(cap);
  return folded.length === raw.length ? raw.slice(start, start + cap.length) : cap;
}

const DISLIKE =
  /\b(?:non mi piace|non mi piacciono|non mi va giu|odio|detesto|non sopporto|non digerisco|mi fa schifo|mi fanno schifo|non mangio mai|non amo)\s+(.+)/;
const LIKE =
  /\b(?:adoro|amo|mi piace(?: tanto| molto| un sacco| da morire)?|mi piacciono(?: tanto| molto| un sacco| da morire)?|vado matt[oa] per|stravedo per|(?:il )?mio (?:cibo|piatto) preferito e|i miei (?:cibi|piatti) preferiti sono)\s+(.+)/;
const REMEMBER =
  /\b(?:ricorda(?:ti)?|tieni a mente|memorizza|segnati|sappi|ricordati sempre)\s+(?:che\s+)?(.+)/;
const FORGET =
  /\b(?:dimentica(?:ti)?(?: che)?|scordati(?: che)?|non ricordare piu(?: che)?|togli dalla memoria|cancella dalla memoria|non e piu vero che)\s+(.+)/;
const SAVE_SHORTCUT =
  /\b(?:salva|memorizza|ricorda|segna)(?:lo|la|li|le)?\s+(?:questo pasto\s+|quest[oa]\s+|il pasto\s+|questa colazione\s+|questo pranzo\s+|questa cena\s+|questo spuntino\s+)?(?:come|con il nome|col nome|chiamandolo|chiamandola)\s+["“«]?(.+?)["”»]?[.!]?$/;

const ARTICLES =
  /^(?:il|lo|la|i|gli|le|l|un|uno|una|del|dello|della|dei|degli|delle|di|al|alla|ai|alle|sapore del|sapore della|gusto del|gusto della)\s+/;
const FILLER =
  /\s+(?:in generale|da morire|tantissimo|moltissimo|molto|tanto|un sacco|per niente|proprio|davvero|affatto|sempre|mai)$/;
// "mi piace questa ricetta" is feedback, not a lasting preference
const DEICTIC = /^(?:questa|questo|questi|queste|quest|la tua|il tuo|l idea|il piano|la ricetta)\b/;

function clean(s: string): string {
  let t = s
    .replace(/[.!?;:)"“”«»]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const f = () => fold(t);
  while (ARTICLES.test(f())) t = t.slice(f().match(ARTICLES)![0].length);
  while (FILLER.test(f())) t = t.slice(0, t.length - f().match(FILLER)![0].length);
  return t.trim();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function splitItems(s: string): string[] {
  return s
    .split(/,|\s+e\s+|\s+ed\s+|\s+oppure\s+|\s+o\s+/i)
    .map(clean)
    .filter((x) => x.length > 1 && x.length <= 40)
    .slice(0, 4)
    .map(capitalize);
}

function foodPreference(raw: string): { kind: MemoryKind; items: string[] } | null {
  const f = fold(raw);
  const d = f.match(DISLIKE);
  if (d) {
    if (DEICTIC.test(d[1].trim())) return null;
    return { kind: 'dislike', items: splitItems(rawCapture(raw, f, d)) };
  }
  const l = f.match(LIKE);
  if (l) {
    if (DEICTIC.test(l[1].trim())) return null;
    return { kind: 'like', items: splitItems(rawCapture(raw, f, l)) };
  }
  return null;
}

/** Memory requests in a chat message: "odio i funghi", "ricordati che la sera mi alleno", "dimentica il salmone". */
export function parseMemory(raw: string): MemoryOps | null {
  const text = raw.trim();
  const f = fold(text);

  const forget = f.match(FORGET);
  if (forget) {
    const items = splitItems(rawCapture(text, f, forget));
    return items.length ? { forget: items } : null;
  }

  const remember = f.match(REMEMBER);
  const body = remember ? rawCapture(text, f, remember) : text;
  const pref = foodPreference(body);
  if (pref?.items.length) return { add: pref.items.map((t) => ({ kind: pref.kind, text: t })) };
  if (remember) {
    const note = capitalize(clean(body)).slice(0, 90);
    return note.length > 3 ? { add: [{ kind: 'note', text: note }] } : null;
  }
  return null;
}

/** "Salvalo come colazione solita" → "Colazione solita". */
export function parseShortcutName(raw: string): string | null {
  const text = raw.trim();
  const f = fold(text);
  const m = f.match(SAVE_SHORTCUT);
  if (!m) return null;
  const name = capitalize(
    rawCapture(text, f, m)
      .replace(/["“”«»]/g, '')
      .trim()
  ).slice(0, 32);
  return name.length > 1 ? name : null;
}

const SLOT_WORDS: [RegExp, string][] = [
  [/colazione/, 'Colazione'],
  [/pranzo/, 'Pranzo'],
  [/cena/, 'Cena'],
  [/spuntino|merenda/, 'Spuntino'],
];

/**
 * Finds the shortcut a message refers to: its name ("colazione solita"),
 * or "il solito pranzo" / "la solita colazione" / "come sempre a cena".
 */
export function matchShortcut(raw: string, shortcuts: Shortcut[]): Shortcut | null {
  if (!shortcuts.length) return null;
  const t = normalize(raw);
  const words = t.split(' ');
  const said = new Set(words.map(stem));
  // every word of the name, in any order and gender: "la solita colazione" ↔ "Colazione solita"
  const byName = shortcuts
    .filter((s) => {
      const n = normalize(s.name)
        .split(' ')
        .filter((w) => w.length > 2 && !STOP.has(w));
      return n.length > 0 && n.join(' ').length >= 4 && n.every((w) => said.has(stem(w)));
    })
    .sort((a, b) => b.name.length - a.name.length)[0];
  if (byName && words.length <= normalize(byName.name).split(' ').length + 5) return byName;

  if (
    /\b(solit[oa]|di sempre|come sempre|il mio solito|la mia solita)\b/.test(t) &&
    words.length <= 9
  ) {
    const slot = SLOT_WORDS.find(([re]) => re.test(t))?.[1];
    const pool = slot ? shortcuts.filter((s) => s.meal.label === slot) : shortcuts;
    return [...pool].sort((a, b) => b.uses - a.uses)[0] ?? null;
  }
  return null;
}

// ——— matching memories against food ———

const GROUPS: Record<string, string[]> = {
  pesce: [
    'pesce',
    'salmone',
    'tonno',
    'merluzzo',
    'orata',
    'branzino',
    'sgombro',
    'alici',
    'baccala',
  ],
  carne: [
    'carne',
    'pollo',
    'manzo',
    'tacchino',
    'maiale',
    'vitello',
    'prosciutto',
    'bresaola',
    'polpette',
    'hamburger',
    'guanciale',
    'pancetta',
  ],
  latticini: [
    'latte',
    'yogurt',
    'skyr',
    'formaggio',
    'feta',
    'grana',
    'parmigiano',
    'mozzarella',
    'ricotta',
    'burro',
    'panna',
  ],
  formaggi: ['formaggio', 'feta', 'grana', 'parmigiano', 'mozzarella', 'ricotta', 'pecorino'],
  formaggio: ['formaggio', 'feta', 'grana', 'parmigiano', 'mozzarella', 'ricotta', 'pecorino'],
  legumi: ['legumi', 'ceci', 'lenticchie', 'fagioli', 'piselli', 'edamame', 'fave', 'hummus'],
  uova: ['uovo', 'uova', 'frittata'],
  uovo: ['uovo', 'uova', 'frittata'],
  crostacei: ['gamberi', 'gamberetti', 'scampi', 'aragosta'],
  'frutti di mare': ['gamberi', 'gamberetti', 'cozze', 'vongole', 'calamari', 'polpo'],
  funghi: ['funghi', 'champignon', 'porcini'],
  tofu: ['tofu', 'tempeh'],
  soia: ['soia', 'tofu', 'tempeh', 'edamame'],
};

const STOP = new Set([
  'di',
  'del',
  'della',
  'dei',
  'delle',
  'con',
  'e',
  'al',
  'alla',
  'il',
  'la',
  'le',
  'gli',
  'i',
  'lo',
  'un',
  'una',
  'piatti',
  'piatto',
  'cibi',
  'cibo',
  'troppo',
  'molto',
  'tipo',
  'tutto',
  'tutti',
]);

function stem(w: string): string {
  return w.length >= 5 ? w.replace(/(he|hi|e|i|a|o)$/, '') : w;
}

/** For each significant word of a memory, the alternatives that count as a match (all words must match). */
function phraseTerms(text: string): string[][] {
  const t = normalize(text);
  if (GROUPS[t]) return [GROUPS[t].map(stem)];
  return t
    .split(' ')
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => (GROUPS[w] ?? [w]).map(stem));
}

function mentions(haystack: string, text: string): boolean {
  const terms = phraseTerms(text);
  if (!terms.length) return false;
  const h = ` ${haystack} `;
  return terms.every((alts) => alts.some((a) => h.includes(` ${a}`)));
}

/** The disliked item a dish contains, if any. `dishText` should be normalized. */
export function dislikedIn(dishText: string, memories: MemoryNote[]): string | null {
  return memories.find((m) => m.kind === 'dislike' && mentions(dishText, m.text))?.text ?? null;
}

/** How many loved foods a dish contains. */
export function likesIn(dishText: string, memories: MemoryNote[]): string[] {
  return memories.filter((m) => m.kind === 'like' && mentions(dishText, m.text)).map((m) => m.text);
}

export function sameMemory(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

/** Loose match for "dimentica il salmone" against stored notes. */
export function forgets(note: MemoryNote, term: string): boolean {
  const n = normalize(note.text);
  const q = normalize(term);
  return n === q || (q.length >= 4 && (n.includes(q) || q.includes(n)));
}

/** "a, b e c" */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

export const memoryLabels: Record<MemoryKind, string> = {
  like: 'Ti piace',
  dislike: 'Non ti piace',
  note: 'Da ricordare',
};

/** Memory as plain text for Claude's context. */
export function memoryContext(memories: MemoryNote[], shortcuts: Shortcut[]): string {
  const of = (k: MemoryKind) =>
    memories
      .filter((m) => m.kind === k)
      .map((m) => m.text)
      .join(', ') || '—';
  const sc = shortcuts
    .map((s) => {
      const kcal = Math.round(s.meal.items.reduce((a, i) => a + i.kcal, 0));
      return `"${s.name}" (${s.meal.label}: ${s.meal.items.map((i) => `${i.name} ${i.qty}`).join(', ')}, ${kcal} kcal)`;
    })
    .join('; ');
  return `<memoria>
Ama: ${of('like')}
Non gli piace: ${of('dislike')}
Abitudini e preferenze: ${of('note')}
Scorciatoie salvate: ${sc || '—'}
</memoria>`;
}
