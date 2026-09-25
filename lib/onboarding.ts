/**
 * Conversational onboarding: the user answers in their own words ("sono Luca,
 * vorrei perdere 4 kg e non mangio carne"), Nouri picks out what it can and
 * asks only for what's still missing. At the end it builds the goal card
 * ("scheda obiettivo"): the daily numbers, a realistic timeline, three rules
 * and what to do right now.
 */
import { normalize } from './foods';
import { parseMemory } from './memory';
import { computeTargets, formatKcal, labelForTime } from './nutrition';
import type {
  Activity,
  Capture,
  Diet,
  FactKey,
  Facts,
  Goal,
  OnboardingMessage,
  Profile,
} from './types';

export type { Capture, FactKey, Facts, OnboardingMessage };

export interface OnboardingTurn {
  text: string;
  captures: Capture[];
  chips: string[];
  asked: FactKey | null;
}

const GREETING =
  /^(ciao|salve|hey|ehi|ehila|buongiorno|buonasera|buon pomeriggio|allora|ok|okay)\b\s*/;
// words that follow "sono" without being a name
// words that follow "sono" or open a message without being a name
const STOP_WORDS = new Set(
  'ehm uhm mmm boh beh eh si no ok okay allora dunque niente nulla non ma perche cosa come chi ciao salve grazie un una uno a in di da del della al alla molto poco piu meno sempre abbastanza troppo qui qua io mi ti il lo la le gli ancora gia appena circa sui sugli tra fra single mamma papa studente studentessa sovrappeso felice vorrei voglio sono chiamo nome'.split(
    ' '
  )
);
const STOP_STEMS =
  /^(stat[oaie]$|andat|vegetarian|vegan|onnivor|pescetarian|intollerant|allergic|celiac|sedentari|stanc|sportiv|attiv|pigr|magr|grass|alt[oaie]$|bass[oaie]$|nuov|ingrassat|dimagrit|incint|sposat|pront[oaie]$|curios|content[oaie]$)/;
const notName = (w: string) => STOP_WORDS.has(w) || STOP_STEMS.test(w) || /^m+$/.test(w);

const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  una: 1,
  uno: 1,
  due: 2,
  tre: 3,
  quattro: 4,
  cinque: 5,
  sei: 6,
  sette: 7,
  otto: 8,
  dieci: 10,
};

const toNum = (s: string) => NUMBER_WORDS[s] ?? Number(s.replace(',', '.'));

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** What a message says about the user. `asked` is the question it answers. */
export function extractFacts(raw: string, asked: FactKey | null): Partial<Facts> {
  const t = normalize(raw);
  const f: Partial<Facts> = {};

  // ——— name ———
  const named = [
    ...t.matchAll(/\b(?:mi chiamo|chiamami|il mio nome e|io sono|sono)\s+([a-z]{2,})/g),
  ].find((m) => !notName(m[1]));
  if (named) {
    // "sono giulia" only counts as a name when it's what we asked, or it's written capitalised
    const cap = new RegExp(`\\b${named[1]}\\b`, 'i').exec(raw);
    const upper = cap ? /^[A-ZÀ-Ý]/.test(cap[0]) : false;
    if (upper || asked === 'name' || /mi chiamo|chiamami|il mio nome/.test(named[0]))
      f.name = capitalize(named[1]);
  }
  if (!f.name && asked === 'name') {
    const words = t.replace(GREETING, '').split(' ').filter(Boolean);
    if (words.length && words.length <= 3 && /^[a-z]{2,}$/.test(words[0]) && !notName(words[0]))
      f.name = capitalize(words[0]);
  }

  // ——— goal ———
  const lose =
    /(perder|dimagr|calare|scendere|buttare giu|togliere|smaltire|pancia|sgonfi|asciugar|definizione|chili di troppo|qualche chilo(?! in piu)|stare piu leggero|rimettermi in forma)/.test(
      t
    );
  const gain =
    /(massa|muscol|ingrassare|prendere (qualche )?(chil|kg|peso)|aumentare (di )?peso|mettere su|mettere (qualche )?(chil|kg)|irrobust|sono troppo magr)/.test(
      t
    );
  const energy = /(energi|stanc|affaticat|concentra|lucid|sonnolen|abbiocco|carica)/.test(t);
  const maintain =
    /(mantener|restare (in forma|cosi)|mangiare (meglio|sano|bene|in modo sano|piu sano)|equilibr|abitudini|salute|sano|stare bene|sentirmi (bene|meglio)|in forma|benessere)/.test(
      t
    );
  if (gain && !/(non|senza) (voglio )?(ingrassare|prendere peso)/.test(t)) f.goal = 'gain';
  else if (lose) f.goal = 'lose';
  else if (energy) f.goal = 'energy';
  else if (maintain) f.goal = 'maintain';

  // ——— kilos: body weight, kilos to lose/gain, or target weight ———
  const aim = t.match(
    /(?:perdere|perderne|togliere|toglierne|calare|buttare giu|mettere su|prendere|aumentare(?: di)?|smaltire|scendere di)\s+(?:almeno |circa |sui |tipo |un )?(?:(\d{1,2}(?:[.,]\d)?)\s*(?:kg|chili|chilo|kili|kilo)?|(un|due|tre|quattro|cinque|sei|sette|otto|dieci)\s*(?:kg|chili|chilo|kili|kilo))\b/
  );
  if (aim) {
    const n = toNum(aim[1] ?? aim[2]);
    if (n > 0 && n <= 40) f.aimKg = n;
  }
  const target = t.match(
    /(?:arrivare|scendere|tornare|stare) (?:a|sui|intorno ai) (\d{2,3}(?:[.,]\d)?)/
  );
  if (target) {
    const n = toNum(target[1]);
    if (n >= 35 && n <= 250) f.targetWeight = n;
  }
  const weight =
    t.match(
      /\b(?:peso|pesavo|sono sui|sono a|attualmente|ora sono)\s+(?:circa |sui |tipo )?(\d{2,3}(?:[.,]\d)?)/
    ) ??
    t.match(/\b(\d{2,3}(?:[.,]\d)?)\s*(?:kg|chili|kili)\b(?!.*\b(?:perdere|togliere|arrivare))/);
  if (weight) {
    const n = toNum(weight[1]);
    if (n >= 35 && n <= 250 && n !== f.targetWeight && n !== f.aimKg) f.weight = n;
  }
  if (
    f.weight === undefined &&
    /(peso|pesarmi).*(preferisco non|non (lo )?(dico|voglio))|(preferisco non|non voglio) dir(e|lo) (il )?peso/.test(
      t
    )
  )
    f.weight = null;
  if (asked === 'body' && f.weight === undefined) {
    const bare = t.match(/^(?:circa |sui |tipo )?(\d{2,3}(?:[.,]\d)?)\b/);
    if (bare && toNum(bare[1]) >= 35 && toNum(bare[1]) <= 250) f.weight = toNum(bare[1]);
    else if (
      /(preferisco non|non (te )?lo (dico|so)|non (lo )?voglio dire|salta|passo|non saprei|boh|non mi peso|il peso no)/.test(
        t
      )
    )
      f.weight = null;
  }

  // ——— diet and foods to avoid ———
  if (
    /(pescetarian|pesce si|solo pesce|carne no.*pesce|niente carne ma (il )?pesce|non mangio (la )?carne ma (mangio )?(il )?pesce)/.test(
      t
    )
  )
    f.diet = 'pescatarian';
  else if (/(vegan|solo vegetale|plant based|niente di animale|nessun prodotto animale)/.test(t))
    f.diet = 'vegan';
  else if (/(vegetarian|non mangio (la )?carne|niente carne|no carne|senza carne)/.test(t))
    f.diet = 'vegetarian';
  else if (/(mangio di tutto|mangio tutto|onnivor|di tutto un po)/.test(t)) f.diet = 'omnivore';

  const avoidContext =
    asked === 'food' ||
    /(intollerant|allergi|evito|non (mangio|digerisco|posso|tollero|sopporto|bevo)|niente|senza|celiac|no )/.test(
      t
    );
  if (avoidContext) {
    const avoid: string[] = [];
    if (/(lattosio|latticini|latte)/.test(t)) avoid.push('Lattosio');
    if (/(glutine|celiac)/.test(t)) avoid.push('Glutine');
    if (/(frutta (secca|a guscio)|noci|mandorle|nocciole|arachidi)/.test(t))
      avoid.push('Frutta a guscio');
    if (/(crostacei|gamberi|scampi|aragost)/.test(t)) avoid.push('Crostacei');
    if (/\buova\b/.test(t)) avoid.push('Uova');
    if (/pesce/.test(t) && f.diet !== 'pescatarian' && !/pesce si/.test(t)) avoid.push('Pesce');
    if (avoid.length) f.avoid = avoid;
  }
  if (!f.avoid && (f.diet || asked === 'food')) {
    if (/(mangio di tutto|mangio tutto|niente|nulla|nessun|no\b|a posto)/.test(t) || f.diet)
      f.avoid = [];
  }
  // "niente lattosio" answers the food question: everything else is fine
  if (asked === 'food' && !f.diet && f.avoid?.length) f.diet = 'omnivore';

  // ——— activity ———
  const times = t.match(
    /\b(\d|una|due|tre|quattro|cinque|sei|sette)\+? (?:volte|volta|giorni|allenamenti)(?: a| alla| la| per| in| ogni)? ?settimana/
  );
  const sport =
    /(palestra|sport|corro|corsa|correre|mi alleno|allenament|crossfit|pesi|calcio|nuoto|tennis|padel|bici|ciclismo|yoga|pilates|danza|ballo)/.test(
      t
    );
  const noSport =
    /(niente sport|non faccio sport|nessuno sport|mai sport|zero sport|poco sport)/.test(t);
  if (times && sport && !noSport) f.activity = toNum(times[1]) >= 3 ? 'high' : 'medium';
  else if (
    /(cammino|camminat|passeggiat|a piedi|in bici)/.test(t) &&
    !/(poco|quasi mai|raramente)/.test(t)
  )
    f.activity = 'medium';
  else if (
    /(sedentari|quasi mai|lavoro seduto|scrivania|seduto tutto|ufficio|smart working|divano|pigr|poco movimento|mi muovo poco|poco sport)/.test(
      t
    ) ||
    noSport
  )
    f.activity = 'low';
  else if (
    /(tutti i giorni|ogni giorno|lavoro fisico|in piedi tutto|cantiere|sportiv|mi alleno spesso|tanto|molto)/.test(
      t
    ) &&
    (sport || asked === 'body')
  )
    f.activity = 'high';
  else if (
    sport ||
    /(mi muovo|muovermi|qualche volta|ogni tanto)/.test(t) ||
    (asked === 'body' && /(un po|abbastanza|normale|nella media)/.test(t))
  )
    f.activity = 'medium';
  else if (asked === 'body' && /\bpoco\b/.test(t)) f.activity = 'low';
  if (sport && !noSport) f.trains = true;

  // ——— likes and dislikes ("adoro il salmone, odio i funghi") ———
  const mem = parseMemory(raw);
  for (const a of mem?.add ?? []) {
    if (a.text.length > 30) continue;
    if (a.kind === 'like') f.likes = [...(f.likes ?? []), a.text];
    if (a.kind === 'dislike') f.dislikes = [...(f.dislikes ?? []), a.text];
  }
  return f;
}

/** Merges new facts; returns what's new, for the "ho capito" chips. */
export function mergeFacts(
  prev: Facts,
  next: Partial<Facts>
): { facts: Facts; captures: Capture[] } {
  const facts: Facts = { ...prev };
  const captures: Capture[] = [];
  if (next.name && next.name !== prev.name) {
    facts.name = next.name;
    captures.push({ key: 'name', label: next.name });
  }
  if (next.goal && (next.goal !== prev.goal || (next.aimKg && next.aimKg !== prev.aimKg))) {
    facts.goal = next.goal;
    if (next.aimKg) facts.aimKg = next.aimKg;
    captures.push({ key: 'goal', label: goalLabel(facts) });
  } else if (next.aimKg && prev.goal) {
    facts.aimKg = next.aimKg;
    captures.push({ key: 'goal', label: goalLabel(facts) });
  }
  if (next.targetWeight) facts.targetWeight = next.targetWeight;
  if (next.diet && next.diet !== prev.diet) {
    facts.diet = next.diet;
    captures.push({ key: 'diet', label: DIET_SHORT[next.diet] });
  }
  if (next.avoid) {
    const merged = [...new Set([...(prev.avoid ?? []), ...next.avoid])];
    if (prev.avoid === undefined || merged.length !== prev.avoid.length) {
      facts.avoid = merged;
      if (next.avoid.length)
        captures.push({ key: 'avoid', label: `Senza ${joinLower(next.avoid)}` });
    }
  }
  if (next.weight !== undefined && next.weight !== prev.weight) {
    facts.weight = next.weight;
    captures.push({
      key: 'weight',
      label: next.weight ? `${formatKg(next.weight)} kg` : 'Peso non detto',
    });
  }
  if (next.activity && next.activity !== prev.activity) {
    facts.activity = next.activity;
    captures.push({ key: 'activity', label: ACTIVITY_SHORT[next.activity] });
  }
  if (next.trains) facts.trains = true;
  for (const l of next.likes ?? [])
    if (!facts.likes?.includes(l)) {
      facts.likes = [...(facts.likes ?? []), l];
      captures.push({ key: 'like', label: `Ami ${l.toLowerCase()}` });
    }
  for (const d of next.dislikes ?? [])
    if (!facts.dislikes?.includes(d)) {
      facts.dislikes = [...(facts.dislikes ?? []), d];
      captures.push({ key: 'dislike', label: `Niente ${d.toLowerCase()}` });
    }
  // "arrivare a 65" + weight 70 → 5 kg to lose
  if (!facts.aimKg && facts.targetWeight && facts.weight) {
    const diff = Math.round(Math.abs(facts.weight - facts.targetWeight) * 10) / 10;
    if (diff > 0 && diff <= 40) {
      facts.aimKg = diff;
      facts.goal ??= facts.targetWeight < facts.weight ? 'lose' : 'gain';
      captures.unshift({ key: 'goal', label: goalLabel(facts) });
    }
  }
  return { facts, captures };
}

const DIET_SHORT: Record<Diet, string> = {
  omnivore: 'Mangi di tutto',
  vegetarian: 'Niente carne',
  vegan: 'Solo vegetale',
  pescatarian: 'Pesce sì, carne no',
};

const ACTIVITY_SHORT: Record<Activity, string> = {
  low: 'Poco movimento',
  medium: 'Ti muovi un po’',
  high: 'Ti alleni spesso',
};

const formatKg = (n: number) => n.toLocaleString('it-IT', { maximumFractionDigits: 1 });
const joinLower = (l: string[]) =>
  l.length < 2
    ? (l[0] ?? '').toLowerCase()
    : `${l
        .slice(0, -1)
        .map((x) => x.toLowerCase())
        .join(', ')} e ${l[l.length - 1].toLowerCase()}`;

export function goalLabel(f: Pick<Facts, 'goal' | 'aimKg'>): string {
  switch (f.goal) {
    case 'lose':
      return f.aimKg ? `Perdere ${formatKg(f.aimKg)} kg` : 'Perdere peso';
    case 'gain':
      return f.aimKg ? `Mettere su ${formatKg(f.aimKg)} kg` : 'Mettere massa';
    case 'energy':
      return 'Più energia';
    case 'maintain':
      return 'Mangiare meglio';
    default:
      return '';
  }
}

export const GOAL_CHIPS = [
  'Perdere qualche chilo',
  'Avere più energia',
  'Mettere massa',
  'Mangiare meglio',
];
export const FOOD_CHIPS = [
  'Mangio di tutto',
  'Niente carne',
  'Solo vegetale',
  'Carne no, pesce sì',
  'Niente lattosio',
];
export const ACTIVITY_CHIPS = [
  'Lavoro seduto, poco sport',
  'Mi muovo un po’',
  'Sport 3+ volte a settimana',
];

export const FIRST_MESSAGE =
  'Ciao, sono **Nouri**. Ti aiuto a mangiare meglio parlando, senza moduli né tabelle. Come ti chiami? Se ti va, raccontami anche cosa vorresti ottenere, tutto insieme: *«Sono Luca, vorrei perdere 4 kg e non mangio carne»*.';

/** What's still missing, in order. */
export function missing(f: Facts): FactKey | null {
  if (!f.name) return 'name';
  if (!f.goal) return 'goal';
  if (!f.diet) return 'food';
  if (f.weight === undefined || !f.activity) return 'body';
  return null;
}

/** Nouri's answer: a short comment on what it understood, then the next question. */
export function onboardingReply(
  f: Facts,
  captures: Capture[],
  asked: FactKey | null
): OnboardingTurn {
  const got = new Set(captures.map((c) => c.key));
  const bits: string[] = [];
  if (got.has('name')) bits.push(`Piacere, ${f.name}!`);
  if (got.has('goal')) bits.push(GOAL_COMMENT[f.goal!](f));
  if (got.has('diet') || got.has('avoid'))
    bits.push('Segnato, ne terrò conto in ogni idea e piano.');
  if (got.has('like') || got.has('dislike')) bits.push('E mi ricordo i tuoi gusti.');
  if (!bits.length && (got.has('weight') || got.has('activity')) && missing(f))
    bits.push('Perfetto.');

  const next = missing(f);
  if (!next) {
    return {
      text: `${bits.join(' ')} Ho tutto quello che mi serve: ecco la tua **scheda obiettivo**.`.trim(),
      captures,
      chips: [],
      asked: null,
    };
  }
  const nothing = captures.length === 0;
  const lead = nothing
    ? next === 'name'
      ? 'Scusa, non ho colto il nome.'
      : 'Non sono sicuro di aver capito.'
    : bits.join(' ');
  const q = QUESTION[next](f);
  return {
    text: `${lead} ${q.text}`.trim(),
    captures,
    chips: q.chips,
    asked: next,
  };
}

const GOAL_COMMENT: Record<Goal, (f: Facts) => string> = {
  lose: (f) =>
    f.aimKg
      ? `${formatKg(f.aimKg)} kg: si fa, con calma e senza fame.`
      : 'Perdere peso: si fa, con calma e senza fame.',
  gain: () => 'Mettere massa: proteine alte e un piccolo surplus, ci pensiamo insieme.',
  energy: () => 'Più energia: si parte da pasti regolari e niente cali a metà giornata.',
  maintain: () => 'Mangiare meglio, senza contare tutto: bastano poche abitudini furbe.',
};

const QUESTION: Record<FactKey, (f: Facts) => { text: string; chips: string[] }> = {
  name: () => ({ text: 'Come ti chiami?', chips: [] }),
  goal: () => ({ text: 'Cosa vorresti ottenere?', chips: GOAL_CHIPS }),
  food: () => ({
    text: 'Come mangi di solito? E c’è qualcosa che eviti o non digerisci?',
    chips: FOOD_CHIPS,
  }),
  body: (f) => {
    if (f.weight === undefined && !f.activity)
      return {
        text: 'Ultima cosa, per fare bene i conti: quanto pesi più o meno, e quanto ti muovi in una settimana?',
        chips: [...ACTIVITY_CHIPS, 'Il peso preferisco non dirlo'],
      };
    if (f.weight === undefined)
      return {
        text: 'E quanto pesi, più o meno? Serve solo per i conti: se preferisci, lo saltiamo.',
        chips: ['Preferisco non dirlo'],
      };
    return { text: 'E quanto ti muovi in una settimana?', chips: ACTIVITY_CHIPS };
  },
};

/** The profile the onboarding produces. */
export function profileFrom(f: Facts): Profile {
  const goal = f.goal ?? 'maintain';
  const activity = f.activity ?? 'medium';
  const weight = f.weight ?? null;
  return {
    name: f.name ?? 'amico',
    goal,
    diet: f.diet ?? 'omnivore',
    avoid: (f.avoid ?? []).filter((a) => !(a === 'Carne' && f.diet && f.diet !== 'omnivore')),
    weight,
    activity,
    aimKg: f.aimKg,
    trains: f.trains,
    targets: computeTargets(goal, weight, activity),
    createdAt: new Date().toISOString(),
  };
}

// ——— the goal card ———

export interface GoalPlan {
  title: string;
  subtitle: string;
  rules: string[];
  actions: { label: string; text: string; icon: 'chef' | 'calendar' | 'dumbbell' | 'cart' }[];
  summary: string;
}

const MONTHS = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];

function byDate(weeks: number, from: Date): string {
  const d = new Date(from);
  d.setDate(d.getDate() + weeks * 7);
  const part = d.getDate() <= 10 ? 'inizio' : d.getDate() <= 20 ? 'metà' : 'fine';
  return `${part} ${MONTHS[d.getMonth()]}`;
}

export function goalPlan(
  p: Pick<Profile, 'goal' | 'aimKg' | 'weight' | 'targets' | 'diet' | 'avoid' | 'activity'>,
  opts: { trains?: boolean; now?: Date } = {}
): GoalPlan {
  const now = opts.now ?? new Date();
  const T = p.targets;
  const L = (T.water / 1000).toLocaleString('it-IT');
  let subtitle: string;
  if ((p.goal === 'lose' || p.goal === 'gain') && p.aimKg) {
    const rate = p.goal === 'lose' ? Math.min(0.5, Math.max(0.3, (p.weight ?? 70) * 0.005)) : 0.25;
    const weeks = Math.max(2, Math.ceil(p.aimKg / rate));
    subtitle = `Circa ${weeks} settimane a ritmo sostenibile (${formatKg(rate)} kg a settimana): entro ${byDate(weeks, now)}.`;
  } else {
    subtitle = {
      lose: 'Mezzo chilo a settimana al massimo: così resta giù.',
      gain: 'Un quarto di chilo a settimana: muscolo, non solo peso.',
      energy: 'Pasti regolari, proteine a colazione, niente cali di metà giornata.',
      maintain: 'Equilibrio senza contare tutto: bastano poche abitudini.',
    }[p.goal];
  }
  const rules = {
    lose: [
      `Proteine a ogni pasto: **${T.protein} g** al giorno tengono a bada la fame.`,
      'Metà piatto di verdura a pranzo e a cena.',
      `**${formatKcal(T.kcal)} kcal**: un deficit leggero, niente diete lampo.`,
    ],
    gain: [
      `**${T.protein} g** di proteine, divise su 4 pasti.`,
      'Uno spuntino in più ogni giorno, con proteine.',
      'Forza 3 volte a settimana: senza allenamento il surplus non diventa muscolo.',
    ],
    energy: [
      'Colazione con proteine, non solo zuccheri.',
      'Carboidrati integrali a pranzo: niente abbiocco alle tre.',
      `**${L} L** d’acqua al giorno: spesso la stanchezza è sete.`,
    ],
    maintain: [
      'Piatto unico: metà verdura, un quarto proteine, un quarto carboidrati.',
      `**${T.protein} g** di proteine al giorno.`,
      'Cibi semplici quasi sempre, e un po’ di libertà: niente è vietato.',
    ],
  }[p.goal];

  const moment = labelForTime(now);
  const actions: GoalPlan['actions'] = [
    {
      label: `Idee per ${{ Colazione: 'la colazione', Pranzo: 'il pranzo', Spuntino: 'lo spuntino', Cena: 'la cena' }[moment]}`,
      text: `Idee per ${moment.toLowerCase()}`,
      icon: 'chef',
    },
    {
      label: 'Il piano della settimana',
      text: 'Fammi un piano pasti per la settimana',
      icon: 'calendar',
    },
    opts.trains || p.goal === 'gain'
      ? {
          label: 'Una scheda di allenamento',
          text: 'Fammi una scheda di allenamento',
          icon: 'dumbbell',
        }
      : { label: 'La spesa per iniziare', text: 'Fammi la lista della spesa', icon: 'cart' },
  ];

  const diet = {
    omnivore: 'Di tutto',
    vegetarian: 'Niente carne',
    vegan: 'Solo vegetale',
    pescatarian: 'Pesce sì, carne no',
  }[p.diet];
  const summary = [
    diet,
    p.avoid.length ? `senza ${joinLower(p.avoid)}` : '',
    p.weight ? `${formatKg(p.weight)} kg` : '',
    ACTIVITY_SHORT[p.activity].toLowerCase(),
  ]
    .filter(Boolean)
    .join(' · ');

  return { title: goalLabel(p), subtitle, rules, actions, summary };
}
