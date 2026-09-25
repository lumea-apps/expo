/**
 * Offline "demo brain": a deterministic Italian intent engine that answers with
 * the same generative-UI blocks Claude produces. It keeps the app fully usable
 * with no API key and makes a great fallback when the network is down.
 */
import { fromFoodEntry, nutrientsFor } from '../foodfacts';
import { capitalize, findFood, normalize, parseFoods, type FoodEntry } from '../foods';
import {
  dayName,
  generatePlan,
  planDayTotals,
  planGrocery,
  planTitle,
  recipePool,
  recipeText,
} from '../mealplan';
import { joinList, likesIn, matchShortcut, parseMemory, parseShortcutName } from '../memory';
import {
  dayKey,
  dayTotals,
  formatKcal,
  labelForTime,
  lastSevenDays,
  mealTotals,
  applyProfilePatch,
  greetingFor,
} from '../nutrition';
import { findRecipe, RECIPES, type RecipeEntry } from '../recipes';
import type {
  AssistantTurn,
  FoodItem,
  MealDraft,
  MealLabel,
  MealPlan,
  MemoryOps,
  PlanFocus,
  ProfilePatch,
  Shortcut,
  SwapFood,
  Widget,
} from '../types';
import type { BrainContext, BrainReply, UserInput } from './types';

type Turn = AssistantTurn & {
  waterMl?: number;
  profilePatch?: ProfilePatch;
  memory?: MemoryOps;
  autoLog?: BrainReply['autoLog'];
};

function toReply(turn: Turn): BrainReply {
  return {
    text: turn.text,
    widgets: turn.widgets,
    suggestions: turn.suggestions,
    waterMl: turn.waterMl ?? 0,
    profilePatch: turn.profilePatch,
    memory: turn.memory,
    autoLog: turn.autoLog,
    engine: 'local',
  };
}

export function localRespond(input: UserInput, ctx: BrainContext): BrainReply {
  return quickRespond(input, ctx) ?? toReply(route(input, ctx));
}

/**
 * Answers that never need the network, whatever the engine: saving a meal as a
 * shortcut and using one ("la solita colazione").
 */
export function quickRespond(input: UserInput, ctx: BrainContext): BrainReply | null {
  if (input.image) return null;
  const name = parseShortcutName(input.text);
  if (name) return toReply(shortcutSaveTurn(name, ctx));
  const t = normalize(input.text);
  if (/\b(non|domani|ieri|salto|saltare|senza|quanto|quante)\b/.test(t) || input.text.includes('?'))
    return null;
  const sc = matchShortcut(input.text, ctx.shortcuts);
  return sc ? toReply(shortcutUseTurn(sc, t)) : null;
}

function route(input: UserInput, ctx: BrainContext): Turn {
  const t = normalize(input.text);
  if (input.image) return photoTurn(input, ctx);

  const planRequest = parsePlanRequest(t, ctx);
  if (planRequest) return mealPlanTurn(planRequest, ctx);

  const memory = parseMemory(input.text);
  const patch = parsePlanChange(t);
  if (patch)
    return { ...planTurn(patch, ctx), memory: ctx.memoryOn ? (memory ?? undefined) : undefined };
  if (memory) return memoryTurn(memory, ctx);
  if (
    /(cosa (ti )?ricordi|cosa sai) (di me|dei miei gusti)|la mia memoria|cosa hai memorizzato/.test(
      t
    )
  )
    return recallTurn(ctx);

  if (FACTS_RE.test(t) && !/(mi (restano|mancano|rimangono)|ho mangiato|ho bevuto)/.test(t)) {
    const food = findFood(input.text);
    if (food) return factsTurn(food, t, ctx);
  }

  const water = parseWater(t);
  const foods = parseFoods(input.text).filter((f) => !(water && /acqua/.test(f.name)));

  if (
    /(ricett|come (si )?(fa|prepar|cucin)|procedimento)/.test(t) ||
    (findRecipe(input.text) && !foods.length)
  ) {
    return recipeTurn(
      findRecipe(input.text) ??
        pickRecipes(ctx, momentFrom(t), {
          protein: /protein/.test(t),
          quick: /(veloce|rapid|pochi minuti)/.test(t),
          light: /(legger|light)/.test(t),
        })[0],
      ctx
    );
  }
  if (/(spesa|lista|supermercato)/.test(t)) return groceryTurn(ctx, t);
  if (/(invece d|alternativ|sostitu|al posto d|swap|piu leggero di)/.test(t))
    return swapTurn(t, ctx);
  if (water && !foods.length) return waterTurn(ctx, water);
  if (/(acqua|bere|idrat)/.test(t) && !foods.length) return waterTurn(ctx, 0);
  if (/(settiman|andamento|trend|ultimi giorni|progress)/.test(t)) return weekTurn(ctx);

  const wantsIdeas =
    /(idea|idee|suggeri|consigli|cosa (mangio|cucino|preparo|posso)|ho fame|proponi|voglia di)/.test(
      t
    );
  if (foods.length && !wantsIdeas) return logTurn(foods, t, ctx, water);
  if (wantsIdeas || /(proteic|leggero|veloce|colazione|pranzo|cena|spuntino|merenda)/.test(t)) {
    return ideasTurn(t, ctx);
  }
  if (
    /(oggi|giornata|come sto|riepilogo|macro|calorie|quanto mi manca|rimang|bilancio|com e andata)/.test(
      t
    )
  ) {
    return summaryTurn(ctx);
  }
  if (/^(ciao|hey|ehi|buongiorno|buonasera|salve|hello)/.test(t)) return helloTurn(ctx);
  if (/(grazie|perfetto|ottimo|top)/.test(t)) {
    return {
      text: 'Sempre qui. Quando mangi qualcosa, raccontamelo come lo racconteresti a un amico — al resto penso io.',
      widgets: [],
      suggestions: ['Com’è andata oggi?', 'Idee per la cena', 'Fammi la lista della spesa'],
    };
  }
  return fallbackTurn(ctx);
}

// ——— helpers ———

function remaining(ctx: BrainContext) {
  const today = dayTotals(ctx.meals);
  const T = ctx.profile.targets;
  return {
    today,
    kcal: T.kcal - today.kcal,
    protein: T.protein - today.protein,
    carbs: T.carbs - today.carbs,
    fat: T.fat - today.fat,
  };
}

function momentFrom(t: string): MealLabel {
  if (/colazione|mattina|brunch/.test(t)) return 'Colazione';
  if (/pranzo/.test(t)) return 'Pranzo';
  if (/cena|stasera/.test(t)) return 'Cena';
  if (/spuntino|merenda|snack/.test(t)) return 'Spuntino';
  return labelForTime();
}

function momentWord(m: MealLabel): string {
  return { Colazione: 'colazione', Pranzo: 'pranzo', Cena: 'cena', Spuntino: 'uno spuntino' }[m];
}

function joinNames(items: FoodItem[]): string {
  const names = items.map((i, idx) => (idx === 0 ? i.name : i.name.toLowerCase()));
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

function parseWater(t: string): number {
  if (!/(acqua|bevuto|bicchier|borraccia|litr)/.test(t)) return 0;
  const litres = t.match(/(\d+(?:[.,]\d+)?)\s*(l|litri|litro)\b/);
  if (litres) return Math.round(Number(litres[1].replace(',', '.')) * 1000);
  if (/mezzo litro/.test(t)) return 500;
  if (/un litro/.test(t)) return 1000;
  const ml = t.match(/(\d+)\s*ml/);
  if (ml) return Number(ml[1]);
  const glasses = t.match(/(\d+|un|uno|due|tre|quattro|cinque)\s*bicchier/);
  if (glasses) {
    const map: Record<string, number> = { un: 1, uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5 };
    return (map[glasses[1]] ?? Number(glasses[1])) * 250;
  }
  if (/borraccia/.test(t)) return 500;
  return 0;
}

function pickRecipes(
  ctx: BrainContext,
  moment: MealLabel,
  opts: { light?: boolean; protein?: boolean; quick?: boolean } = {}
): RecipeEntry[] {
  const left = remaining(ctx);
  const allowedPool = recipePool(ctx.profile, ctx.memories);
  const inMoment = allowedPool.filter((r) => r.moments.includes(moment));
  const pool = inMoment.length >= 3 ? inMoment : allowedPool;
  const scored = pool
    .map((r) => {
      let score = r.moments.includes(moment) ? 3 : 0;
      const budget = Math.max(250, left.kcal);
      score -= Math.abs(r.kcal - Math.min(budget, 650)) / 200;
      if (left.protein > 30 || opts.protein) score += r.protein / 18;
      if (opts.light) score -= r.kcal / 180;
      if (opts.quick) score -= r.minutes / 6;
      score += likesIn(recipeText(r), ctx.memories).length * 1.2;
      return { r, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored.map((s) => s.r);
}

function toIdea(r: RecipeEntry) {
  return {
    title: r.title,
    emoji: r.emoji,
    kcal: r.kcal,
    protein: r.protein,
    minutes: r.minutes,
    tagline: r.tagline,
  };
}

// ——— turns ———

function helloTurn(ctx: BrainContext): Turn {
  const left = remaining(ctx);
  const moment = labelForTime();
  const pieces = [
    `Ciao ${ctx.profile.name}`,
    left.today.kcal === 0
      ? `Oggi il diario è ancora vuoto. Cosa hai mangiato — o cosa ti va per ${momentWord(moment)}?`
      : `Hai ancora **${formatKcal(Math.max(0, left.kcal))} kcal** di margine oggi. Ti preparo qualche idea per ${momentWord(moment)}?`,
  ];
  return {
    text: pieces.join(' '),
    widgets: [],
    suggestions: [
      `Idee per ${momentWord(moment)}`,
      'Com’è andata oggi?',
      'Ho bevuto un bicchiere d’acqua',
    ],
  };
}

function fallbackTurn(ctx: BrainContext): Turn {
  return {
    text: `Non sono sicuro di aver capito, ${ctx.profile.name}. Puoi dirmi cosa hai mangiato (es. *“due uova e un toast con avocado”*), chiedermi un’idea per il prossimo pasto o mandarmi una foto del piatto.`,
    widgets: [],
    suggestions: ['Ho mangiato un poke al salmone', 'Idee per la cena', 'Com’è andata oggi?'],
  };
}

function logTurn(foods: FoodItem[], t: string, ctx: BrainContext, waterMl: number): Turn {
  const label = /colazione/.test(t)
    ? 'Colazione'
    : /pranzo/.test(t)
      ? 'Pranzo'
      : /cena/.test(t)
        ? 'Cena'
        : /spuntino|merenda/.test(t)
          ? 'Spuntino'
          : labelForTime();
  const meal = { title: joinNames(foods), emoji: foods[0].emoji, label, items: foods } as const;
  const tot = mealTotals(meal);
  const left = remaining(ctx);
  const afterKcal = left.kcal - tot.kcal;

  let comment = '';
  if (tot.protein >= 25) comment = 'Bel colpo di proteine.';
  else if (tot.kcal > 750)
    comment = 'Pasto importante: ci bilanciamo più tardi con qualcosa di leggero.';
  else if (tot.protein < 10 && tot.kcal > 250)
    comment = 'Poche proteine qui — le recuperiamo al prossimo pasto.';
  else if (tot.kcal <= 350) comment = 'Leggero e pulito.';
  else comment = 'Segnato.';

  const widgets: Widget[] = [{ type: 'meal_log', meal: { ...meal, items: [...foods] } }];
  if (afterKcal < 0) {
    widgets.push({
      type: 'insight',
      tone: 'warning',
      title: `Oltre di ${formatKcal(-afterKcal)} kcal`,
      body: 'Nessun dramma: una giornata non fa la settimana. Domani ripartiamo con colazione proteica e tanta verdura.',
    });
  }

  return {
    text: `${comment} Ho stimato **${formatKcal(tot.kcal)} kcal** e **${tot.protein} g di proteine**${waterMl ? `, più ${waterMl} ml d’acqua` : ''}. Controlla le porzioni e registra quando ti torna.`,
    widgets,
    suggestions:
      afterKcal > 300
        ? [
            'Com’è andata oggi?',
            `Idee per ${momentWord(nextMoment(label))}`,
            'Un’alternativa più leggera',
          ]
        : ['Com’è andata oggi?', 'Qualcosa di leggero per dopo', 'Ho bevuto mezzo litro d’acqua'],
    waterMl,
  };
}

function nextMoment(label: MealLabel): MealLabel {
  return label === 'Colazione'
    ? 'Pranzo'
    : label === 'Pranzo'
      ? 'Spuntino'
      : label === 'Spuntino'
        ? 'Cena'
        : 'Colazione';
}

const PHOTO_GUESSES: { title: string; emoji: string; items: FoodItem[] }[] = [
  {
    title: 'Poke bowl al salmone',
    emoji: '🥗',
    items: [
      {
        name: 'Riso sushi',
        emoji: '🍚',
        qty: '~150 g',
        kcal: 195,
        protein: 4,
        carbs: 43,
        fat: 0.5,
        confidence: 0.84,
      },
      {
        name: 'Salmone crudo',
        emoji: '🐟',
        qty: '~100 g',
        kcal: 205,
        protein: 20,
        carbs: 0,
        fat: 13,
        confidence: 0.91,
      },
      {
        name: 'Avocado',
        emoji: '🥑',
        qty: '~50 g',
        kcal: 80,
        protein: 1,
        carbs: 4,
        fat: 7.5,
        confidence: 0.77,
      },
      {
        name: 'Edamame e cetriolo',
        emoji: '🫛',
        qty: '~60 g',
        kcal: 70,
        protein: 6,
        carbs: 5,
        fat: 3,
        confidence: 0.69,
      },
      {
        name: 'Salsa teriyaki',
        emoji: '🥢',
        qty: '1 cucchiaio',
        kcal: 40,
        protein: 0.5,
        carbs: 8,
        fat: 0,
        confidence: 0.55,
      },
    ],
  },
  {
    title: 'Avocado toast e uova',
    emoji: '🥑',
    items: [
      {
        name: 'Pane a lievitazione naturale',
        emoji: '🍞',
        qty: '2 fette',
        kcal: 220,
        protein: 8,
        carbs: 42,
        fat: 1.5,
        confidence: 0.86,
      },
      {
        name: 'Avocado',
        emoji: '🥑',
        qty: '~70 g',
        kcal: 112,
        protein: 1.4,
        carbs: 6,
        fat: 10,
        confidence: 0.88,
      },
      {
        name: 'Uova in camicia',
        emoji: '🥚',
        qty: '2 uova',
        kcal: 156,
        protein: 12.6,
        carbs: 1,
        fat: 10.6,
        confidence: 0.93,
      },
      {
        name: 'Semi e olio',
        emoji: '🌻',
        qty: 'q.b.',
        kcal: 60,
        protein: 1.5,
        carbs: 1,
        fat: 5.5,
        confidence: 0.52,
      },
    ],
  },
  {
    title: 'Pasta al pomodoro e basilico',
    emoji: '🍝',
    items: [
      {
        name: 'Spaghetti',
        emoji: '🍝',
        qty: '~90 g secchi',
        kcal: 320,
        protein: 11,
        carbs: 65,
        fat: 1.4,
        confidence: 0.82,
      },
      {
        name: 'Sugo al pomodoro',
        emoji: '🍅',
        qty: '1 mestolo',
        kcal: 60,
        protein: 2,
        carbs: 9,
        fat: 2,
        confidence: 0.8,
      },
      {
        name: 'Olio EVO',
        emoji: '🫒',
        qty: '~1 cucchiaio',
        kcal: 90,
        protein: 0,
        carbs: 0,
        fat: 10,
        confidence: 0.58,
      },
      {
        name: 'Parmigiano',
        emoji: '🧀',
        qty: '~10 g',
        kcal: 40,
        protein: 3.3,
        carbs: 0,
        fat: 2.8,
        confidence: 0.63,
      },
    ],
  },
  {
    title: 'Salmone, quinoa e broccoli',
    emoji: '🐟',
    items: [
      {
        name: 'Filetto di salmone',
        emoji: '🐟',
        qty: '~140 g',
        kcal: 290,
        protein: 29,
        carbs: 0,
        fat: 19,
        confidence: 0.9,
      },
      {
        name: 'Quinoa',
        emoji: '🌾',
        qty: '~120 g cotta',
        kcal: 145,
        protein: 5.3,
        carbs: 26,
        fat: 2.3,
        confidence: 0.79,
      },
      {
        name: 'Broccoli',
        emoji: '🥦',
        qty: '~150 g',
        kcal: 50,
        protein: 4,
        carbs: 7,
        fat: 0.6,
        confidence: 0.92,
      },
    ],
  },
];

function photoTurn(input: UserInput, ctx: BrainContext): Turn {
  const seed = input.image?.uri ?? '';
  let h = 0;
  for (let i = 0; i < seed.length; i += 97) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const guess = PHOTO_GUESSES[h % PHOTO_GUESSES.length];
  const tot = mealTotals(guess);
  const label = momentFrom(normalize(input.text));
  return {
    text: `Ecco cosa vedo nel piatto **${guess.title}**, circa **${formatKcal(tot.kcal)} kcal**. Le voci con fiducia bassa sono quelle che dalla foto si stimano peggio (condimenti, olio): toccale per correggerle.`,
    widgets: [
      {
        type: 'meal_log',
        meal: { title: guess.title, emoji: guess.emoji, label, items: guess.items },
      },
    ],
    suggestions: [
      'Com’è andata oggi?',
      `Idee per ${momentWord(nextMoment(label))}`,
      'Un’alternativa più leggera',
    ],
  };
}

function ideasTurn(t: string, ctx: BrainContext): Turn {
  const moment = momentFrom(t);
  const light = /(leggero|leggera|poche calorie|light)/.test(t);
  const protein = /(protein)/.test(t);
  const picks = pickRecipes(ctx, moment, { light, protein }).slice(0, 4);
  const left = remaining(ctx);
  const lead =
    left.kcal > 150
      ? `Ti restano **${formatKcal(left.kcal)} kcal** e **${Math.max(0, left.protein)} g di proteine**.`
      : 'Il budget di oggi è quasi pieno, quindi resto leggero.';
  return {
    text: `${lead} Ecco ${picks.length} idee per ${momentWord(moment)}${protein ? ' ad alto contenuto proteico' : light ? ' leggere' : ''} — tocca una card per la ricetta.`,
    widgets: [{ type: 'ideas', ideas: picks.map(toIdea) }],
    suggestions: [
      `Ricetta: ${picks[0]?.title ?? 'qualcosa di veloce'}`,
      'Qualcosa di più leggero',
      'Fammi la lista della spesa',
    ],
  };
}

function recipeTurn(r: RecipeEntry, ctx: BrainContext): Turn {
  const left = remaining(ctx);
  const fits = r.kcal <= Math.max(0, left.kcal) + 80;
  return {
    text: `Eccola: ${r.tagline.toLowerCase()}. Porta **${r.protein} g di proteine** per ${formatKcal(r.kcal)} kcal${fits ? ' e ci sta perfettamente nel tuo budget di oggi.' : ' — oggi sei un po’ oltre, magari tienila per domani.'}`,
    widgets: [{ type: 'recipe', recipe: { ...r } }],
    suggestions: [
      'Aggiungila alla lista della spesa',
      'Un’alternativa vegana',
      'Com’è andata oggi?',
    ],
  };
}

function summaryTurn(ctx: BrainContext): Turn {
  const left = remaining(ctx);
  const T = ctx.profile.targets;
  if (left.today.kcal === 0) {
    const today = dayKey();
    const pending = ctx.history.some(
      (m) => dayKey(m.at) === today && m.widgets?.some((w) => w.type === 'meal_log')
    );
    return {
      text: pending
        ? 'Nel diario di oggi non c’è ancora niente: se la stima di prima ti torna, tocca **Registra nel diario** sulla card e la conto subito.'
        : `Oggi la pagina è ancora bianca Raccontami il primo pasto — anche solo *“cappuccino e cornetto”* — e inizio a tenere il conto per te.`,
      widgets: [{ type: 'macros' }],
      suggestions: ['Cappuccino e cornetto', 'Idee per colazione', 'Ho mangiato uno yogurt greco'],
    };
  }
  const pPct = Math.round((left.today.protein / T.protein) * 100);
  const kPct = Math.round((left.today.kcal / T.kcal) * 100);
  const waterPct = Math.round((ctx.waterToday / T.water) * 100);
  const insight: Widget =
    pPct >= kPct
      ? {
          type: 'insight',
          tone: 'positive',
          title: 'Proteine in anticipo sul piano',
          body: `Sei al ${pPct}% delle proteine con il ${kPct}% delle calorie: esattamente il ritmo giusto per ${ctx.profile.goal === 'gain' ? 'costruire massa' : 'restare sazio più a lungo'}.`,
        }
      : {
          type: 'insight',
          tone: 'neutral',
          title: `Mancano ${Math.max(0, left.protein)} g di proteine`,
          body: 'Nel prossimo pasto punta su una fonte proteica vera (pesce, legumi, uova, tofu, yogurt greco) e il resto viene da sé.',
        };
  const widgets: Widget[] = [{ type: 'macros' }, insight];
  if (waterPct < 50) widgets.push({ type: 'water' });
  return {
    text: `Finora **${formatKcal(left.today.kcal)} kcal** su ${formatKcal(T.kcal)}. ${left.kcal > 0 ? `Ti restano ${formatKcal(left.kcal)} kcal da giocarti bene.` : 'Budget di oggi completato.'}${waterPct < 50 ? ' E occhio all’acqua: sei indietro.' : ''}`,
    widgets,
    suggestions: [
      `Idee per ${momentWord(labelForTime())}`,
      'Com’è andata la settimana?',
      'Ho bevuto due bicchieri d’acqua',
    ],
  };
}

function weekTurn(ctx: BrainContext): Turn {
  const days = lastSevenDays();
  const totals = days.map((d) => dayTotals(ctx.meals, d).kcal);
  const logged = totals.filter((k) => k > 0);
  const T = ctx.profile.targets.kcal;
  if (logged.length < 2) {
    return {
      text: 'Per leggere un trend mi servono almeno un paio di giorni di diario. Intanto ecco com’è messa la settimana — più mi racconti, più diventa interessante.',
      widgets: [{ type: 'week' }],
      suggestions: ['Com’è andata oggi?', 'Idee per la cena', 'Idee per colazione'],
    };
  }
  const avg = Math.round(logged.reduce((a, b) => a + b, 0) / logged.length);
  const inRange = logged.filter((k) => Math.abs(k - T) / T < 0.1).length;
  return {
    text: `Media di **${formatKcal(avg)} kcal** al giorno contro un obiettivo di ${formatKcal(T)}. ${inRange} giorni su ${logged.length} dentro al ±10% — ${inRange / logged.length >= 0.6 ? 'costanza da manuale.' : 'c’è margine per essere più regolari.'}`,
    widgets: [
      { type: 'week' },
      {
        type: 'insight',
        tone: inRange / logged.length >= 0.6 ? 'positive' : 'neutral',
        title: inRange / logged.length >= 0.6 ? 'Ritmo stabile' : 'Settimana a onde',
        body:
          inRange / logged.length >= 0.6
            ? 'La costanza batte la perfezione: i giorni “normali” sono quelli che spostano davvero l’ago.'
            : 'I picchi arrivano quasi sempre dopo giornate con poche proteine a pranzo. Proviamo a blindare il pranzo?',
      },
    ],
    suggestions: ['Idee di pranzo proteiche', 'Com’è andata oggi?', 'Fammi la lista della spesa'],
  };
}

function waterTurn(ctx: BrainContext, ml: number): Turn {
  const total = ctx.waterToday + ml;
  const T = ctx.profile.targets.water;
  return {
    text: ml
      ? `Segnato: **+${ml} ml** Sei a ${(total / 1000).toLocaleString('it-IT', { maximumFractionDigits: 2 })} L su ${(T / 1000).toLocaleString('it-IT')} L.`
      : `Sei a **${(total / 1000).toLocaleString('it-IT', { maximumFractionDigits: 2 })} L** su ${(T / 1000).toLocaleString('it-IT')} L oggi. Tocca il bicchiere ogni volta che bevi.`,
    widgets: [{ type: 'water' }],
    suggestions: ['Com’è andata oggi?', 'Idee per uno spuntino', 'Com’è andata la settimana?'],
    waterMl: ml,
  };
}

function groceryTurn(ctx: BrainContext, t: string): Turn {
  const plan = activePlan(ctx);
  const recentRecipe = ctx.history
    .slice(-6)
    .some((m) => m.widgets?.some((w) => w.type === 'recipe'));
  if (plan && (/(piano|menu|settiman)/.test(t) || !recentRecipe)) {
    const sections = planGrocery(plan);
    const count = sections.reduce((a, s) => a + s.items.length, 0);
    return {
      text: `Ecco la spesa per il tuo piano ${plan.kind === 'week' ? 'della settimana' : 'di oggi'}: **${count} cose**, divise per reparto. Spunta man mano che riempi il carrello.`,
      widgets: [{ type: 'grocery', sections }],
      suggestions: ['Com’è andata oggi?', 'Piano di oggi', 'Idee per uno spuntino'],
    };
  }
  const lastRecipe = [...ctx.history]
    .reverse()
    .flatMap((m) => m.widgets ?? [])
    .find((w): w is Extract<Widget, { type: 'recipe' }> => w.type === 'recipe');
  const base = lastRecipe ? RECIPES.find((r) => r.title === lastRecipe.recipe.title) : undefined;
  const picks = [
    ...(base ? [base] : []),
    ...pickRecipes(ctx, 'Cena', { protein: true }).filter((r) => r !== base),
  ].slice(0, 3);
  const aisles: Record<string, string[]> = {};
  picks.forEach((r) =>
    Object.entries(r.aisles).forEach(([aisle, items]) => {
      aisles[aisle] = Array.from(new Set([...(aisles[aisle] ?? []), ...items]));
    })
  );
  return {
    text: `Ho messo insieme la spesa per ${picks.length} pasti veloci: ${picks.map((p) => `*${p.title}*`).join(', ')}. Spunta man mano che riempi il carrello.`,
    widgets: [
      {
        type: 'grocery',
        sections: Object.entries(aisles).map(([title, items]) => ({ title, items })),
      },
    ],
    suggestions: [`Ricetta: ${picks[0].title}`, 'Idee per colazione', 'Com’è andata oggi?'],
  };
}

const SWAPS: Record<string, { to: SwapFood; reason: string }> = {
  patatine: {
    to: { name: 'Patate al forno con paprika', emoji: '🥔', kcal: 190, protein: 4 },
    reason: 'Stessa croccantezza, metà dei grassi: il forno ventilato a 220 °C fa miracoli.',
  },
  cornetto: {
    to: { name: 'Yogurt greco e granola', emoji: '🥣', kcal: 285, protein: 21 },
    reason: 'Calorie simili ma 4 volte le proteine: arrivi a pranzo senza fame.',
  },
  pasta: {
    to: { name: 'Pasta di legumi', emoji: '🍝', kcal: 420, protein: 28 },
    reason: 'Il doppio delle proteine e più fibre, stesso gesto nel piatto.',
  },
  carbonara: {
    to: { name: 'Carbonara di zucchine', emoji: '🥒', kcal: 480, protein: 28 },
    reason: 'Più uovo, meno guanciale e zucchine croccanti: cremosa uguale.',
  },
  pizza: {
    to: { name: 'Trancio + insalatona', emoji: '🍕', kcal: 560, protein: 30 },
    reason: 'Ti togli la voglia di pizza e aggiungi volume e proteine.',
  },
  hamburger: {
    to: { name: 'Burger di pollo, pane integrale', emoji: '🍔', kcal: 430, protein: 38 },
    reason: 'Stesso rito, carne magra e pane che sazia di più.',
  },
  birra: {
    to: { name: 'Birra analcolica', emoji: '🍺', kcal: 70, protein: 1 },
    reason: 'Il gusto resta, le calorie liquide crollano.',
  },
  tiramisu: {
    to: { name: 'Skyr al cacao e frutti rossi', emoji: '🍓', kcal: 180, protein: 18 },
    reason: 'Voglia di dolce soddisfatta, con proteine al posto del mascarpone.',
  },
  gelato: {
    to: { name: 'Frozen yogurt greco', emoji: '🍦', kcal: 150, protein: 12 },
    reason: 'Freddo, cremoso e con un terzo delle calorie.',
  },
  cioccolato: {
    to: { name: '2 quadretti di fondente 85%', emoji: '🍫', kcal: 60, protein: 1 },
    reason: 'Più intenso, ne basta la metà.',
  },
  kebab: {
    to: { name: 'Piadina con pollo e verdure', emoji: '🌯', kcal: 480, protein: 34 },
    reason: 'Street food uguale, grassi dimezzati.',
  },
  spritz: {
    to: { name: 'Spritz “light” con più soda', emoji: '🍹', kcal: 100, protein: 0 },
    reason: 'Stesso aperitivo, meno zucchero e alcol.',
  },
};

function swapTurn(t: string, ctx: BrainContext): Turn {
  const target =
    t
      .split(
        /invece d[ie]l?l?[ao]?|al posto d[ie]l?l?[ao]?|alternativ[ae] (a|al|alla|allo|ai|agli|alle)|sostituire|sostituisco/
      )
      .pop() ?? t;
  const food = findFood(target) ?? findFood(t);
  const swap = food ? SWAPS[food.key] : undefined;
  if (!food || !swap) {
    const vegan = ctx.profile.diet === 'vegan' || /vegan/.test(t);
    const picks = pickRecipes(
      { ...ctx, profile: { ...ctx.profile, diet: vegan ? 'vegan' : ctx.profile.diet } },
      labelForTime(),
      { light: true }
    ).slice(0, 3);
    return {
      text: 'Dimmi cosa vuoi sostituire (es. *“un’alternativa alle patatine”*). Intanto ecco qualche opzione più leggera per il prossimo pasto:',
      widgets: [{ type: 'ideas', ideas: picks.map(toIdea) }],
      suggestions: [
        'Alternativa alla carbonara',
        'Alternativa al cornetto',
        'Alternativa alla pizza',
      ],
    };
  }
  const from: SwapFood = {
    name: capitalize(food.key),
    emoji: food.emoji,
    kcal: food.kcal,
    protein: Math.round(food.protein),
  };
  const delta = from.kcal - swap.to.kcal;
  return {
    text: `Nessun divieto, solo scambi furbi. Al posto di **${from.name.toLowerCase()}** prova **${swap.to.name.toLowerCase()}**: ${delta > 0 ? `risparmi ~${formatKcal(delta)} kcal` : 'calorie simili'}${swap.to.protein > from.protein ? ` e guadagni ${swap.to.protein - from.protein} g di proteine` : ''}.`,
    widgets: [{ type: 'swap', from, to: swap.to, reason: swap.reason }],
    suggestions: [
      'Com’è andata oggi?',
      'Altre idee leggere',
      `Registra ${swap.to.name.toLowerCase()}`,
    ],
  };
}

// ——— memory & shortcuts ———

function slotIn(t: string): MealLabel | null {
  if (/colazione/.test(t)) return 'Colazione';
  if (/pranzo/.test(t)) return 'Pranzo';
  if (/cena/.test(t)) return 'Cena';
  if (/spuntino|merenda/.test(t)) return 'Spuntino';
  return null;
}

/** The reply for a shortcut, also used when it is tapped from a menu. */
export function shortcutUseTurn(sc: Shortcut, t = ''): Turn {
  const meal: MealDraft = { ...sc.meal, label: slotIn(t) ?? sc.meal.label };
  const tot = mealTotals(meal);
  return {
    text: `Fatto: **${sc.name}** è nel diario, **${formatKcal(tot.kcal)} kcal** e **${tot.protein} g di proteine**. Se oggi era diversa, tocca *Annulla* e raccontamela.`,
    widgets: [{ type: 'meal_log', meal }],
    suggestions: [
      'Com’è andata oggi?',
      `Idee per ${momentWord(nextMoment(meal.label))}`,
      'Ho bevuto un bicchiere d’acqua',
    ],
    autoLog: { shortcutId: sc.id },
  };
}

/** The meal to save as a shortcut: the latest one logged or estimated in chat. */
function lastMeal(ctx: BrainContext): MealDraft | null {
  const card = [...ctx.history]
    .reverse()
    .find((m) => m.role === 'assistant' && m.widgets?.some((w) => w.type === 'meal_log'));
  const cardMeal = card?.widgets?.find(
    (w): w is Extract<Widget, { type: 'meal_log' }> => w.type === 'meal_log'
  )?.meal;
  const logged = [...ctx.meals].sort((a, b) => b.at.localeCompare(a.at))[0];
  if (logged && (!card || logged.at >= card.at)) {
    const { title, emoji, label, items } = logged;
    return { title, emoji, label, items };
  }
  return cardMeal ?? null;
}

function shortcutSaveTurn(name: string, ctx: BrainContext): Turn {
  const found = lastMeal(ctx);
  const meal = found ? { ...found } : null;
  if (!meal) {
    return {
      text: 'Non trovo un pasto da salvare. Raccontami cosa hai mangiato e poi dimmi *«salvalo come colazione solita»*: da lì in poi basterà il nome.',
      widgets: [],
      suggestions: ['Yogurt greco, granola e caffè', 'Com’è andata oggi?'],
    };
  }
  const slot = slotIn(normalize(name));
  if (slot) meal.label = slot;
  const tot = mealTotals(meal);
  return {
    text: `Salvato come scorciatoia **${name}** (${formatKcal(tot.kcal)} kcal). La prossima volta basta scrivere *«${name.toLowerCase()}»* o toccarla dal **+**.`,
    widgets: [],
    suggestions: ['Com’è andata oggi?', `Idee per ${momentWord(nextMoment(meal.label))}`],
    memory: { shortcut: { name, meal } },
  };
}

function memoryTurn(ops: MemoryOps, ctx: BrainContext): Turn {
  const moment = labelForTime();
  if (!ctx.memoryOn) {
    return {
      text: 'La memoria è spenta, quindi non me lo segno. Puoi riattivarla da **Profilo › Memoria** quando vuoi.',
      widgets: [],
      suggestions: [`Idee per ${momentWord(moment)}`, 'Com’è andata oggi?'],
    };
  }
  if (ops.forget?.length) {
    return {
      text: `Fatto, dimentico ${joinList(ops.forget.map((f) => f.toLowerCase()))}.`,
      widgets: [],
      suggestions: ['Cosa ricordi di me?', `Idee per ${momentWord(moment)}`],
      memory: ops,
    };
  }
  const of = (k: 'like' | 'dislike' | 'note') =>
    (ops.add ?? []).filter((a) => a.kind === k).map((a) => a.text);
  const likes = of('like');
  const dislikes = of('dislike');
  const parts: string[] = [];
  if (dislikes.length)
    parts.push(
      `Segnato: niente ${joinList(dislikes.map((d) => d.toLowerCase()))} nelle mie idee e nei piani pasti.`
    );
  if (likes.length)
    parts.push(
      `${capitalize(joinList(likes.map((l) => l.toLowerCase())))} ${likes.length > 1 ? 'compariranno' : 'comparirà'} più spesso nelle mie proposte.`
    );
  if (of('note').length) parts.push('Me lo ricordo.');

  const widgets: Widget[] = [];
  if (likes.length) {
    const loved = likes.map((text) => ({ id: '', kind: 'like' as const, text, at: '' }));
    const picks = recipePool(ctx.profile, ctx.memories)
      .filter((r) => likesIn(recipeText(r), loved).length)
      .slice(0, 3);
    if (picks.length) {
      widgets.push({ type: 'ideas', ideas: picks.map(toIdea) });
      parts.push('Per cominciare:');
    }
  }
  return {
    text: parts.join(' '),
    widgets,
    suggestions: ['Fammi un piano pasti', 'Cosa ricordi di me?', `Idee per ${momentWord(moment)}`],
    memory: ops,
  };
}

function recallTurn(ctx: BrainContext): Turn {
  if (!ctx.memoryOn) {
    return {
      text: 'La memoria è spenta: non sto tenendo traccia dei tuoi gusti. Puoi riattivarla da **Profilo › Memoria**.',
      widgets: [],
      suggestions: ['Com’è andata oggi?'],
    };
  }
  const changes = [
    ...ctx.memories.map((m) => ({ kind: m.kind, text: m.text })),
    ...ctx.shortcuts.map((s) => ({ kind: 'shortcut' as const, text: s.name })),
  ];
  if (!changes.length) {
    return {
      text: 'Per ora non ho niente in memoria. Dimmi cosa ti piace e cosa no (*«odio i funghi»*, *«adoro il salmone»*) e ne terrò conto in idee e piani pasti.',
      widgets: [],
      suggestions: ['Adoro il salmone', 'Non mi piacciono i funghi', 'Fammi un piano pasti'],
    };
  }
  return {
    text: 'Ecco cosa so di te. Tocca **Gestisci** per cambiare qualcosa, o dimmelo qui (*«dimentica il salmone»*).',
    widgets: [{ type: 'memory', changes, recall: true }],
    suggestions: ['Fammi un piano pasti', `Idee per ${momentWord(labelForTime())}`],
  };
}

// ——— meal plans ———

interface PlanRequest {
  kind: 'day' | 'week';
  focus: PlanFocus;
  tomorrow: boolean;
  fresh: boolean;
}

function activePlan(ctx: BrainContext): MealPlan | null {
  const today = dayKey();
  return ctx.plan && ctx.plan.days.some((d) => d.date >= today) ? ctx.plan : null;
}

function parsePlanRequest(t: string, ctx: BrainContext): PlanRequest | null {
  const explicit =
    /(piano (pasti|alimentare|settimanale|giornaliero|della settimana|(di|per) (oggi|domani|la settimana|la prossima settimana|stasera))|piano dei pasti|meal ?plan|menu (settimanale|della settimana|(di|per) (oggi|domani|la settimana))|programma(re|mi)? (i |dei )?pasti|pianifica(re|mi)? (i |la )?(pasti|settimana)|organizza(re|mi)? (i |la )?(pasti|settimana)|cosa mangio (domani|questa settimana|la prossima settimana|nei prossimi giorni))/.test(
      t
    );
  const followUp =
    Boolean(ctx.plan) &&
    /((rifai|rigenera|cambia|un altro|nuovo) (il |un )?(piano|menu)|(piano|menu) (piu|con piu) (proteic|proteine|veloce|leggero)|piu (proteine|veloce|leggero) nel (piano|menu))/.test(
      t
    );
  if (!explicit && !followUp) return null;
  const week =
    /(settiman|7 giorni|sette giorni|prossimi giorni)/.test(t) ||
    (followUp && !/(oggi|domani|giorn)/.test(t) && ctx.plan?.kind === 'week');
  const focus: PlanFocus = /(protein|massa)/.test(t)
    ? 'protein'
    : /(veloc|rapid|poco tempo)/.test(t)
      ? 'quick'
      : /(legger|dimagr|light)/.test(t)
        ? 'light'
        : 'balanced';
  return {
    kind: week ? 'week' : 'day',
    focus,
    tomorrow: !week && /domani/.test(t),
    fresh:
      followUp ||
      /(nuovo|rifai|rigenera|crea|fammi|fai|genera|prepara|organizza|pianifica|programma|un altro|diverso|voglio|vorrei|mi serve|dammi)/.test(
        t
      ),
  };
}

function mealPlanTurn(req: PlanRequest, ctx: BrainContext): Turn {
  const target = new Date();
  if (req.tomorrow) target.setDate(target.getDate() + 1);
  const key = dayKey(target);
  const current = activePlan(ctx);

  // "Piano di oggi" with a plan already in place: show it instead of making a new one.
  if (!req.fresh && current) {
    const day = current.days.find((d) => d.date === key);
    if (req.kind === 'day' && day) {
      const tot = planDayTotals(day);
      return {
        text: `${dayName(key)} dal tuo piano: **${formatKcal(tot.kcal)} kcal** e **${Math.round(tot.protein)} g di proteine**. Tocca un piatto per la ricetta.`,
        widgets: [{ type: 'meal_plan', plan: { ...current, kind: 'day', days: [day] } }],
        suggestions: ['Lista della spesa del piano', 'Rifai il piano', 'Com’è andata oggi?'],
      };
    }
    if (req.kind === 'week' && current.kind === 'week') {
      return {
        text: 'Ecco la tua settimana. Scegli un giorno per vedere i pasti, o tocca un piatto per la ricetta.',
        widgets: [{ type: 'meal_plan', plan: current }],
        suggestions: ['Lista della spesa del piano', 'Rifai il piano', 'Piano di oggi'],
      };
    }
  }

  const plan = generatePlan({
    profile: ctx.profile,
    memories: ctx.memories,
    kind: req.kind,
    focus: req.focus,
    start: target,
  });
  const T = ctx.profile.targets;
  const totals = plan.days.map(planDayTotals);
  const avgKcal = totals.reduce((a, d) => a + d.kcal, 0) / totals.length;
  const avgProtein = totals.reduce((a, d) => a + d.protein, 0) / totals.length;
  const distinct = new Set(plan.days.flatMap((d) => d.meals.map((m) => m.title))).size;

  const notes: string[] = [];
  const skipped = [
    ...ctx.profile.avoid.map((a) => a.toLowerCase()),
    ...ctx.memories.filter((m) => m.kind === 'dislike').map((m) => m.text.toLowerCase()),
  ];
  if (skipped.length) notes.push(`Ho lasciato fuori ${joinList(skipped)}.`);
  const loved = [
    ...new Set(
      plan.days.flatMap((d) => d.meals.flatMap((m) => likesIn(recipeText(m), ctx.memories)))
    ),
  ];
  if (loved.length) notes.push(`E c’è spazio per ${joinList(loved.map((l) => l.toLowerCase()))}.`);

  const lead =
    plan.kind === 'week'
      ? `Ecco la tua settimana: **${distinct} piatti diversi**, in media **${formatKcal(avgKcal)} kcal** e **${Math.round(avgProtein)} g di proteine** al giorno (obiettivo ${formatKcal(T.kcal)}).`
      : `${planTitle(plan)}: **${formatKcal(avgKcal)} kcal** e **${Math.round(avgProtein)} g di proteine**, su un obiettivo di ${formatKcal(T.kcal)}.`;
  return {
    text: `${lead} ${notes.join(' ')} Tocca un piatto per la ricetta, o apri il piano per segnare cosa mangi.`.replace(
      /\s+/g,
      ' '
    ),
    widgets: [{ type: 'meal_plan', plan }],
    suggestions: [
      'Lista della spesa del piano',
      'Rifai il piano',
      plan.kind === 'week' ? 'Piano di oggi' : 'Piano per la settimana',
    ],
  };
}

// ——— nutrition facts ———

const FACTS_RE =
  /(quant[ei] (calorie|kcal|proteine|carboidrati|grassi|zuccheri)|valori nutrizionali|informazioni nutrizionali|tabella nutrizionale|macro (di|del|della|dello|dei|delle|degli)|e (calorico|calorica|proteico|proteica)|fa ingrassare|quanto ingrassa)/;

function factsTurn(food: FoodEntry, t: string, ctx: BrainContext): Turn {
  const facts = fromFoodEntry(food);
  const g = t.match(/(\d+)\s*(?:g|gr|grammi)\b/);
  if (g && Number(g[1]) > 0) facts.portion = { label: `${g[1]} g`, grams: Number(g[1]) };
  const n = nutrientsFor(facts, facts.portion.grams);
  const pShare = (n.protein * 4) / Math.max(1, n.kcal);
  const fShare = (n.fat * 9) / Math.max(1, n.kcal);
  const note =
    pShare >= 0.3
      ? ' Ottima fonte di proteine.'
      : fShare >= 0.55
        ? ' Sono soprattutto grassi: occhio alle porzioni.'
        : '';
  const left = remaining(ctx).kcal;
  const g1 = (v: number) => v.toLocaleString('it-IT', { maximumFractionDigits: 1 });
  return {
    text: `**${facts.name}**, ${facts.portion.label}: **${formatKcal(n.kcal)} kcal**, ${g1(n.protein)} g di proteine, ${g1(n.carbs)} g di carboidrati e ${g1(n.fat)} g di grassi.${note}${left > 0 && n.kcal > left ? ` Oggi ti restano ${formatKcal(left)} kcal.` : ''}`,
    widgets: [{ type: 'food_facts', food: facts }],
    suggestions: [`Alternativa a ${food.key}`, 'Com’è andata oggi?'],
  };
}

// ——— plan changes ———

const AVOID_WORDS: [RegExp, string][] = [
  [/lattosio|latticini|latte/, 'Lattosio'],
  [/glutine|celiac/, 'Glutine'],
  [/frutta a guscio|noci|nocciole|mandorle|arachidi/, 'Frutta a guscio'],
  [/crostacei|gamberi/, 'Crostacei'],
  [/uova|uovo/, 'Uova'],
  [/pesce/, 'Pesce'],
  [/carne/, 'Carne'],
];

/** Detects requests to change the plan: goal, diet, weight, activity, foods to avoid, macro tweaks. */
function parsePlanChange(t: string): ProfilePatch | null {
  const p: ProfilePatch = {};
  const wants = /(voglio|vorrei|obiettivo|punto a|il mio scopo|cambia|da oggi|ora)/.test(t);

  if (wants && /(dimagr|perdere (peso|qualche chil|chili)|definir|asciugar)/.test(t))
    p.goal = 'lose';
  else if (
    wants &&
    /(mettere massa|aumentare (la )?massa|massa muscolare|ipertrofia|mettere su muscol)/.test(t)
  )
    p.goal = 'gain';
  else if (wants && /(piu energia|avere energia|essere piu energic)/.test(t)) p.goal = 'energy';
  else if (wants && /(mantenere|mantenermi|mangiare meglio|mangiare sano)/.test(t))
    p.goal = 'maintain';

  const diet = t.match(
    /(?:sono|diventat[oa]|da oggi|ora|mangio) (?:\w+ )?(vegan|vegetarian|pescetarian|onnivor)/
  );
  if (diet) {
    p.diet = (
      {
        vegan: 'vegan',
        vegetarian: 'vegetarian',
        pescetarian: 'pescatarian',
        onnivor: 'omnivore',
      } as const
    )[diet[1] as 'vegan' | 'vegetarian' | 'pescetarian' | 'onnivor'];
  }

  const weight = t.match(
    /(?:peso|pesavo|sono sui|sono a|arrivato a|arrivata a)\s*(\d{2,3}(?:[.,]\d)?)\s*(?:kg|chili|chilogrammi)?/
  );
  if (weight) p.weight = Number(weight[1].replace(',', '.'));

  if (
    /(mi alleno|allenamenti|palestra|corro|sport)/.test(t) &&
    /(ogni giorno|tutti i giorni|[4-7] volte|spesso|di piu|molto)/.test(t)
  ) {
    p.activity = 'high';
  } else if (/(sedentari|mi muovo poco|non mi alleno|smesso di allenarmi|lavoro seduto)/.test(t)) {
    p.activity = 'low';
  }

  const avoidCtx = t.match(
    /(?:intollerante|allergic[oa]|non (?:mangio|posso mangiare|tollero)|evito|niente|senza) (?:piu )?(?:al |alla |alle |ai |agli |il |la |le |i |gli |l )?([a-z ]+)/
  );
  if (avoidCtx) {
    const hit = AVOID_WORDS.find(([re]) => re.test(avoidCtx[1]));
    if (hit) p.avoidAdd = [hit[1]];
  }
  const okAgain = t.match(
    /(?:posso (?:di nuovo|ancora) mangiare|non sono piu intollerante (?:al |alla |ai )?|di nuovo) ([a-z ]+)/
  );
  if (okAgain) {
    const hit = AVOID_WORDS.find(([re]) => re.test(okAgain[1]));
    if (hit) p.avoidRemove = [hit[1]];
  }

  if (/(piu|aumenta(re)?|alza(re)?) (di )?(le )?proteine/.test(t)) p.proteinFactor = 1.15;
  if (/(meno|abbassa(re)?|riduci|ridurre) (le )?calorie/.test(t)) p.kcalFactor = 0.9;
  if (/(piu|aumenta(re)?|alza(re)?) (le )?calorie/.test(t)) p.kcalFactor = 1.1;

  return Object.keys(p).length ? p : null;
}

function planTurn(patch: ProfilePatch, ctx: BrainContext): Turn {
  const { profile, changes } = applyProfilePatch(ctx.profile, patch);
  if (!changes.length) {
    return {
      text: 'Il tuo piano è già impostato così Se vuoi cambiarlo, dimmi per esempio *“voglio mettere massa”* o *“sono diventato vegano”*.',
      widgets: [],
      suggestions: ['Com’è andata oggi?', 'Voglio più proteine', 'Idee per cena'],
    };
  }
  const T = profile.targets;
  const dietNote =
    patch.diet || patch.avoidAdd
      ? ' Da ora le mie idee e ricette terranno conto anche di questo.'
      : '';
  return {
    text: `Fatto, piano aggiornato. Ora punti a **${formatKcal(T.kcal)} kcal** e **${T.protein} g di proteine** al giorno.${dietNote}`,
    widgets: [],
    suggestions: ['Idee con il nuovo piano', 'Com’è andata oggi?', 'Fammi la lista della spesa'],
    profilePatch: patch,
  };
}

// ——— proactive ———

/**
 * The first message of a new day, written by Nouri before the user says anything:
 * yesterday in one line, one observation, and where to start today.
 */
export function dailyBrief(ctx: BrainContext): BrainReply {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yt = dayTotals(ctx.meals, dayKey(y));
  const T = ctx.profile.targets;
  const moment = labelForTime();
  const hello = `${greetingFor()}, ${ctx.profile.name}.`;
  const widgets: Widget[] = [];
  let text: string;
  let proteinFocus = false;

  if (yt.kcal === 0) {
    text = `${hello} Ieri il diario è rimasto vuoto: nessun problema, ripartiamo da oggi.`;
  } else {
    const kp = Math.round((yt.kcal / T.kcal) * 100);
    const pp = Math.round((yt.protein / T.protein) * 100);
    proteinFocus = pp < 90;
    text = `${hello} Ieri hai chiuso a **${formatKcal(yt.kcal)} kcal** (${kp}% del piano) con le proteine al **${pp}%**.`;
    if (kp < 60) {
      widgets.push({
        type: 'insight',
        tone: 'neutral',
        title: 'Diario a metà',
        body: 'Probabilmente ieri qualche pasto non è finito nel diario. Nessun problema: oggi basta una frase per ogni pasto e i conti tornano.',
      });
    } else if (kp > 115) {
      widgets.push({
        type: 'insight',
        tone: 'warning',
        title: 'Ieri un po’ sopra',
        body: 'Oggi niente compensazioni drastiche: pasti normali, tanta verdura e acqua. Il corpo ragiona sulla settimana, non sul giorno.',
      });
    } else if (proteinFocus) {
      widgets.push({
        type: 'insight',
        tone: 'neutral',
        title: 'Oggi mettiamo al centro le proteine',
        body: `Ne sono mancati ${Math.max(0, T.protein - yt.protein)} g. ${
          moment === 'Colazione'
            ? 'Partire con una colazione proteica rende tutto il resto più facile.'
            : `A ${momentWord(moment)} scegli una fonte proteica vera: legumi, uova, pesce, tofu o yogurt greco.`
        }`,
      });
    } else {
      widgets.push({
        type: 'insight',
        tone: 'positive',
        title: 'Giornata centrata',
        body: 'Calorie e proteine nel posto giusto. Se oggi replichi lo schema di ieri, sei già a metà dell’opera.',
      });
    }
  }

  const planned = ctx.plan?.days.find((d) => d.date === dayKey());
  if (planned && ctx.plan) {
    widgets.push({ type: 'meal_plan', plan: { ...ctx.plan, kind: 'day', days: [planned] } });
  } else {
    const picks = pickRecipes(ctx, moment, { protein: proteinFocus }).slice(0, 3);
    if (picks.length) widgets.push({ type: 'ideas', ideas: picks.map(toIdea) });
  }
  return {
    text: planned
      ? `${text} Ecco cosa prevede il tuo piano per oggi:`
      : `${text} Ecco da dove partirei per ${momentWord(moment)}:`,
    widgets,
    suggestions: [
      'Com’è andata la settimana?',
      `Idee per ${momentWord(nextMoment(moment))}`,
      'Ho bevuto un bicchiere d’acqua',
    ],
    waterMl: 0,
    engine: 'local',
  };
}
