/**
 * Claude-powered brain. Claude answers with a JSON "turn" (text + generative UI
 * widgets + quick replies) constrained by structured outputs, so the chat can
 * render rich cards instead of walls of text.
 *
 * Configure ONE of these in `.env` (see README):
 *   EXPO_PUBLIC_NOURI_API_URL      → your proxy that injects the API key (recommended)
 *   EXPO_PUBLIC_ANTHROPIC_API_KEY  → direct key, for local prototyping only
 *                                    (EXPO_PUBLIC_* values ship inside the app bundle)
 */
import './polyfill';

import Anthropic from '@anthropic-ai/sdk';

import { EXERCISES, exerciseById } from '../exercises';
import { entryOf } from '../grocery';
import { planContext, planMealKey } from '../mealplan';
import { memoryContext } from '../memory';
import {
  AVOID_OPTIONS,
  dayKey,
  dayTotals,
  formatTime,
  mealsOn,
  mealTotals,
  uid,
} from '../nutrition';
import type {
  Activity,
  AssistantTurn,
  ChatMessage,
  Diet,
  Goal,
  MealLabel,
  MealPlan,
  MemoryKind,
  MemoryOps,
  PlanFocus,
  ProfilePatch,
  TrainingGoal,
  TrainingSetup,
  Widget,
  WorkoutPlan,
} from '../types';
import {
  dose,
  doseLabel,
  exerciseCard,
  generateWorkoutPlan,
  sessionOn,
  setupSummary,
  weekStart,
  workoutContext,
} from '../workout';
import type { BrainContext, BrainReply, UserInput } from './types';

export const CLAUDE_MODEL = 'claude-opus-5';

const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
const proxyURL = process.env.EXPO_PUBLIC_NOURI_API_URL;

export const claudeConfigured = Boolean(apiKey || proxyURL);

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: apiKey || 'via-proxy',
      baseURL: proxyURL || undefined,
      // The app is a client: on web the SDK refuses to run without this flag.
      dangerouslyAllowBrowser: true,
      maxRetries: 1,
      timeout: 90_000,
    });
  }
  return client;
}

const SYSTEM_PROMPT = `Sei Nouri, un assistente nutrizionale conversazionale dentro un'app mobile.
Parli come un amico competente: caldo, diretto, spiritoso quanto basta, mai giudicante. Rispondi nella lingua dell'utente (di default italiano).

COME RISPONDI
Ogni risposta è un oggetto JSON con:
- "text": 1–3 frasi brevi. Puoi usare **grassetto** per i numeri chiave e *corsivo* per enfasi. Niente elenchi lunghi nel testo: i dettagli vanno nei widget.
- "widgets": card interattive che l'app disegna sotto al testo (anche nessuna). Scegli solo quelle utili:
  • meal_log — quando l'utente racconta o fotografa cosa ha mangiato. Scomponi il pasto in voci con porzione stimata ("qty"), kcal e macro in grammi, e "confidence" 0–1 (bassa per condimenti/olio o porzioni ambigue). "label" è il momento del pasto. L'utente conferma con un tap: non dire che hai già registrato.
  • macros — riepilogo live della giornata (anelli calorie/proteine/carboidrati/grassi). Usalo per "come sto andando", "quanto mi manca".
  • ideas — 2–4 idee pasto su misura per i macro rimanenti, la dieta e gli alimenti da evitare.
  • recipe — una ricetta completa (ingredienti con dosi per 1 persona, 3–5 passaggi).
  • insight — un'osservazione breve e concreta sui dati (tone: positive | neutral | warning).
  • water — tracker dell'acqua della giornata.
  • grocery — lista della spesa raggruppata per reparto (Ortofrutta, Macelleria, Pescheria, Frigo, Panetteria, Dispensa, Surgelati). Ogni voce ha "qty" con la quantità totale da comprare, sommata su tutti i pasti e le persone ("300 g", "4", "2 fette", "q.b." per spezie e condimenti) e "note" brevissima su dove serve ("2 pasti · lun, gio") oppure "". Per la spesa del piano pasti attivo l'app ha già la sua lista con le quantità: non serve rifarla.
  • week — grafico delle calorie degli ultimi 7 giorni.
  • swap — uno scambio furbo: alimento di partenza → alternativa, con motivo.
  • meal_plan — un piano pasti quando l'utente lo chiede: 1 giorno ("start" today o tomorrow) oppure 7 giorni per la settimana. Se non dice la durata, usa quella predefinita indicata in <piani>. Ogni giorno ha 4 pasti in quest'ordine: Colazione, Pranzo, Spuntino, Cena, con kcal e macro della porzione e minuti di preparazione. Ogni giorno entro ±8% del target calorico e vicino al target di proteine; piatti italiani realistici e vari (nessun piatto più di 2 volte a settimana, mai due giorni di fila). "focus": balanced | protein | quick | light. Nel testo 1–2 frasi (media di kcal e proteine, cosa hai escluso): non elencare i piatti. L'app salva il piano come piano attivo.
  • food_facts — valori nutrizionali di un alimento o prodotto ("quante calorie ha…", "valori del parmigiano"): valori per 100 g (fibre, zuccheri e sale compresi, 0 se trascurabili) e una porzione tipica in grammi. "brand" vuoto se non è un prodotto di marca.
  • goal — la scheda obiettivo dell'utente (obiettivo, tempi realistici, numeri del giorno, tre regole, cosa fare adesso), disegnata dall'app dal profilo: quando chiede del suo obiettivo, "a che punto sono", o dopo che l'ha cambiato.
  • workout_plan — la scheda di allenamento (modulo facoltativo). "mode": current per mostrare quella attiva (in <allenamento>), new per crearne una: scegli goal (strength | muscle | fat_loss | fitness), level 1–3, days 2–6, equipment (none = corpo libero | home = manubri/elastici | gym) e minutes (20 | 30 | 45 | 60) da ciò che dice l'utente e dalla scheda attuale. L'app costruisce la scheda dal suo catalogo di esercizi e la rende attiva: nel testo 1–2 frasi, senza elencare gli esercizi. "session": la lettera della seduta da mostrare ("A", "B"…) o "".
  • exercise — come si esegue un esercizio. "id" è l'id del catalogo qui sotto se l'esercizio c'è (l'app usa la sua spiegazione), altrimenti "" e compili tu muscoli, attrezzi, 3–5 passaggi, 1–3 consigli e 1–3 errori. "dose" es. "3 × 10–12" oppure "".
  • exercises — 3–6 esercizi del catalogo per un muscolo o un obiettivo ("esercizi per i glutei"): "title" breve e gli "ids" del catalogo.
- "suggestions": 2–3 risposte rapide che l'utente potrebbe toccare, scritte in prima persona dal punto di vista dell'utente (max ~32 caratteri).
- "water_ml": millilitri d'acqua che l'utente dice di aver appena bevuto in questo messaggio, altrimenti 0.
- "profile_changes": solo se l'utente chiede di cambiare il suo piano, altrimenti []. Campi e valori ammessi:
  goal = lose | energy | gain | maintain · diet = omnivore | vegetarian | vegan | pescatarian · weight = kg (es. "68.5") ·
  activity = low | medium | high · avoid_add / avoid_remove = Lattosio | Glutine | Frutta a guscio | Crostacei | Uova | Pesce | Carne ·
  protein_factor / kcal_factor = moltiplicatore tra 0.7 e 1.4 (es. "più proteine" → protein_factor "1.15").
  L'app ricalcola i target e mostra da sola una card con il prima e il dopo: nel testo conferma la modifica in una frase, senza ripetere i numeri.
- "memory_add": preferenze stabili che l'utente esprime in questo messaggio e che vale la pena ricordare, altrimenti []. kind = like (cibi che ama) | dislike (cibi che non gli piacciono o non digerisce) | note (abitudini e contesto utili: "pranzo in mensa nei feriali", "si allena la sera"). Testo breve (1–6 parole). Solo ciò che l'utente dice di sé, mai dedotto da un singolo pasto. L'app mostra la conferma: nel testo basta una frase.
- "memory_forget": ciò che l'utente ti chiede di dimenticare ("dimentica il salmone" → "Salmone"), altrimenti [].

MEMORIA
- Il blocco <memoria> è ciò che sai dell'utente: rispettalo sempre. Mai proporre cibi che non gli piacciono, proponi più spesso quelli che ama, tieni conto delle abitudini. Non ripeterlo nel testo se non serve.
- Le scorciatoie sono pasti salvati con un nome: l'app le registra da sola quando l'utente le nomina.
- Se c'è già un piano attivo che copre ciò che l'utente chiede, non crearne un altro: ricordagli che ce l'ha già e rifallo solo se lo chiede esplicitamente ("rifai", "nuovo", "diverso").
- <piani> contiene il piano pasti attivo, giorno per giorno, con i pasti già mangiati: è in memoria, usalo quando l'utente chiede cosa mangiare oggi, stasera, domani o in un altro giorno, e rispondi con i piatti del piano invece di inventarne altri. Per modificarlo crea un nuovo meal_plan (il precedente resta tra i piani salvati).

ALLENAMENTO (facoltativo)
- <allenamento> dice se il modulo è attivo, la scheda con i giorni, la seduta di oggi e le sedute fatte questa settimana. Se è spento non proporre schede di tua iniziativa; se l'utente ne chiede una, creala (l'app attiva il modulo).
- Se c'è già una scheda attiva e l'utente non chiede di cambiarla, mostrala (mode current) invece di rifarla.
- Collega allenamento e alimentazione quando serve: proteine e carboidrati dopo le sedute, idratazione, niente compensazioni drastiche.
- Dolore o infortuni: niente diagnosi, suggerisci varianti più semplici e di sentire un medico o un fisioterapista.
- Catalogo esercizi (id — nome): ${EXERCISES.map((e) => `${e.id} — ${e.name}`).join('; ')}.

PRINCIPI
- Usa il contesto <oggi> per personalizzare: macro rimanenti, pasti già registrati, obiettivo, dieta, alimenti da evitare. Non proporre mai cibi che l'utente evita o incompatibili con la sua dieta.
- Stime realistiche su porzioni italiane; arrotonda kcal all'unità e macro a 1 decimale.
- Niente moralismi, niente "cibi proibiti": solo scambi e bilanciamento.
- Non fai diagnosi mediche. Se emergono segnali di disturbi alimentari, digiuni estremi o deficit pericolosi, rispondi con delicatezza, non incoraggiare restrizioni e suggerisci di parlarne con un professionista.
- Se l'utente chiede qualcosa fuori tema, rispondi in breve e riporta la conversazione sul cibo.`;

const NUM = { type: 'number' };
const STR = { type: 'string' };
const obj = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const widgetOf = (type: string, props: Record<string, unknown> = {}) =>
  obj({ type: { type: 'string', enum: [type] }, ...props });
const swapFood = obj({ name: STR, emoji: STR, kcal: NUM, protein: NUM });

const TURN_SCHEMA = obj({
  text: STR,
  widgets: {
    type: 'array',
    items: {
      anyOf: [
        widgetOf('meal_log', {
          meal: obj({
            title: STR,
            emoji: STR,
            label: { type: 'string', enum: ['Colazione', 'Pranzo', 'Cena', 'Spuntino'] },
            items: {
              type: 'array',
              items: obj({
                name: STR,
                emoji: STR,
                qty: STR,
                kcal: NUM,
                protein: NUM,
                carbs: NUM,
                fat: NUM,
                confidence: NUM,
              }),
            },
          }),
        }),
        widgetOf('macros'),
        widgetOf('recipe', {
          recipe: obj({
            title: STR,
            emoji: STR,
            minutes: NUM,
            kcal: NUM,
            protein: NUM,
            carbs: NUM,
            fat: NUM,
            tagline: STR,
            ingredients: { type: 'array', items: STR },
            steps: { type: 'array', items: STR },
          }),
        }),
        widgetOf('ideas', {
          ideas: {
            type: 'array',
            items: obj({
              title: STR,
              emoji: STR,
              kcal: NUM,
              protein: NUM,
              minutes: NUM,
              tagline: STR,
            }),
          },
        }),
        widgetOf('insight', {
          tone: { type: 'string', enum: ['positive', 'neutral', 'warning'] },
          title: STR,
          body: STR,
        }),
        widgetOf('water'),
        widgetOf('grocery', {
          sections: {
            type: 'array',
            items: obj({
              title: STR,
              items: { type: 'array', items: obj({ name: STR, qty: STR, note: STR }) },
            }),
          },
        }),
        widgetOf('week'),
        widgetOf('swap', { from: swapFood, to: swapFood, reason: STR }),
        widgetOf('meal_plan', {
          start: { type: 'string', enum: ['today', 'tomorrow'] },
          focus: { type: 'string', enum: ['balanced', 'protein', 'quick', 'light'] },
          days: {
            type: 'array',
            items: obj({
              meals: {
                type: 'array',
                items: obj({
                  label: { type: 'string', enum: ['Colazione', 'Pranzo', 'Spuntino', 'Cena'] },
                  title: STR,
                  emoji: STR,
                  kcal: NUM,
                  protein: NUM,
                  carbs: NUM,
                  fat: NUM,
                  minutes: NUM,
                }),
              },
            }),
          },
        }),
        widgetOf('goal'),
        widgetOf('workout_plan', {
          mode: { type: 'string', enum: ['current', 'new'] },
          goal: { type: 'string', enum: ['strength', 'muscle', 'fat_loss', 'fitness'] },
          level: NUM,
          days: NUM,
          equipment: { type: 'string', enum: ['none', 'home', 'gym'] },
          minutes: NUM,
          session: STR,
        }),
        widgetOf('exercise', {
          id: STR,
          name: STR,
          muscles: { type: 'array', items: STR },
          equipment: { type: 'array', items: STR },
          steps: { type: 'array', items: STR },
          tips: { type: 'array', items: STR },
          mistakes: { type: 'array', items: STR },
          dose: STR,
        }),
        widgetOf('exercises', { title: STR, ids: { type: 'array', items: STR } }),
        widgetOf('food_facts', {
          name: STR,
          brand: STR,
          emoji: STR,
          portion_label: STR,
          portion_g: NUM,
          kcal_100g: NUM,
          protein_100g: NUM,
          carbs_100g: NUM,
          fat_100g: NUM,
          fiber_100g: NUM,
          sugars_100g: NUM,
          salt_100g: NUM,
        }),
      ],
    },
  },
  suggestions: { type: 'array', items: STR },
  water_ml: NUM,
  profile_changes: {
    type: 'array',
    items: obj({
      field: {
        type: 'string',
        enum: [
          'goal',
          'diet',
          'weight',
          'activity',
          'avoid_add',
          'avoid_remove',
          'protein_factor',
          'kcal_factor',
        ],
      },
      value: STR,
    }),
  },
  memory_add: {
    type: 'array',
    items: obj({ kind: { type: 'string', enum: ['like', 'dislike', 'note'] }, text: STR }),
  },
  memory_forget: { type: 'array', items: STR },
});

function contextBlock(ctx: BrainContext): string {
  const { profile } = ctx;
  const T = profile.targets;
  const today = dayTotals(ctx.meals);
  const meals = mealsOn(ctx.meals);
  const lines = meals.map((m) => {
    const t = mealTotals(m);
    return `- ${formatTime(m.at)} ${m.label}: ${m.title} (${t.kcal} kcal, P${t.protein} C${t.carbs} G${t.fat})`;
  });
  const avoid = profile.avoid.length ? profile.avoid.join(', ') : 'nulla';
  const memory = ctx.memoryOn
    ? memoryContext(ctx.memories, ctx.shortcuts)
    : '<memoria>spenta: non salvare nulla, memory_add sempre []</memoria>';
  const todayKey = dayKey();
  const active = ctx.plan && ctx.plan.days.some((d) => d.date >= todayKey) ? ctx.plan : null;
  const prefs = `Durata predefinita per un nuovo piano: ${ctx.planPrefs.kind === 'week' ? 'settimana (7 giorni)' : 'un giorno'} · stile ${ctx.planPrefs.focus}`;
  const plan = `\n<piani>\n${prefs}\nPiani precedenti salvati: ${ctx.pastPlans.length}\n${
    active
      ? `Piano attivo:\n${planContext(
          { ...active, days: active.days.filter((d) => d.date >= todayKey) },
          (date, i) => Boolean(ctx.planLog[planMealKey(active.id, date, i)])
        )}`
      : 'Nessun piano attivo.'
  }\n</piani>`;
  return `${memory}${plan}${trainingContext(ctx)}
<oggi>
Ora locale: ${new Date().toLocaleString('it-IT', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
Utente: ${profile.name} · obiettivo ${profile.goal}${profile.aimKg ? ` (${profile.goal === 'gain' ? '+' : '-'}${profile.aimKg} kg)` : ''} · dieta ${profile.diet} · evita: ${avoid}${profile.weight ? ` · ${profile.weight} kg` : ''}
Target giornaliero: ${T.kcal} kcal, P${T.protein} g, C${T.carbs} g, G${T.fat} g, acqua ${T.water} ml
Consumato oggi: ${today.kcal} kcal, P${today.protein} g, C${today.carbs} g, G${today.fat} g, acqua ${ctx.waterToday} ml
Rimanente: ${T.kcal - today.kcal} kcal, P${T.protein - today.protein} g
Pasti registrati oggi:
${lines.length ? lines.join('\n') : '- nessuno'}
</oggi>`;
}

function trainingContext(ctx: BrainContext): string {
  const plan = ctx.training.enabled ? ctx.workoutPlan : null;
  if (!plan)
    return `\n<allenamento>modulo ${ctx.training.enabled ? 'attivo, nessuna scheda' : 'spento'}</allenamento>`;
  const today = sessionOn(plan);
  const from = weekStart();
  const done = ctx.workoutLog.filter((l) => l.date >= from && l.planId === plan.id);
  return `\n<allenamento>
Scheda attiva: ${setupSummary(plan.setup)} (goal ${plan.setup.goal}, level ${plan.setup.level}, equipment ${plan.setup.equipment})
${workoutContext(plan)}
Oggi: ${today ? `seduta ${today.id} — ${today.name}` : 'riposo'}
Fatte questa settimana: ${done.length ? done.map((l) => `${l.name} (${l.date})`).join(', ') : 'nessuna'}
</allenamento>`;
}

function historyToMessages(history: ChatMessage[]): Anthropic.Beta.BetaMessageParam[] {
  const recent = history.slice(-14);
  const firstUser = recent.findIndex((m) => m.role === 'user');
  return recent.slice(firstUser === -1 ? recent.length : firstUser).map((m) =>
    m.role === 'user'
      ? { role: 'user', content: m.text || (m.imageUri ? '[foto di un piatto]' : '…') }
      : {
          role: 'assistant',
          content: JSON.stringify({
            text: m.text,
            widgets: (m.widgets ?? []).filter((w) => w.type !== 'memory').map(compact),
            suggestions: m.suggestions ?? [],
          }),
        }
  );
}

/** Plans are large: past ones are summarised so the history stays light. */
function compact(w: Widget): unknown {
  if (w.type === 'meal_plan')
    return {
      type: 'meal_plan',
      days: w.plan.days.map((d) => ({ meals: d.meals.map((m) => `${m.label}: ${m.title}`) })),
    };
  if (w.type === 'workout_plan')
    return {
      type: 'workout_plan',
      summary: setupSummary(w.plan.setup),
      session: w.sessionId ?? '',
    };
  if (w.type === 'exercise') return { type: 'exercise', id: w.exercise.id, name: w.exercise.name };
  return w;
}

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

function imageBlock(
  image: NonNullable<UserInput['image']>
): Anthropic.Beta.BetaImageBlockParam | null {
  let data = image.base64 ?? null;
  let mediaType = (image.mimeType ?? 'image/jpeg') as ImageMediaType;
  if (!data && image.uri.startsWith('data:')) {
    const match = image.uri.match(/^data:(image\/[a-z]+);base64,(.*)$/);
    if (match) {
      mediaType = match[1] as ImageMediaType;
      data = match[2];
    }
  }
  if (!data) return null;
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mediaType))
    mediaType = 'image/jpeg';
  return { type: 'image', source: { type: 'base64', media_type: mediaType, data } };
}

export async function claudeRespond(input: UserInput, ctx: BrainContext): Promise<BrainReply> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  const img = input.image ? imageBlock(input.image) : null;
  if (img) content.push(img);
  content.push({
    type: 'text',
    text: `${contextBlock(ctx)}\n\n${input.text || (img ? 'Analizza il piatto nella foto e stimane il contenuto.' : '')}`,
  });

  const response = await getClient().beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    // Chat turns are short and latency-sensitive: low effort keeps replies snappy.
    output_config: { effort: 'low', format: { type: 'json_schema', schema: TURN_SCHEMA } },
    cache_control: { type: 'ephemeral' },
    system: SYSTEM_PROMPT,
    messages: [...historyToMessages(ctx.history), { role: 'user', content }],
  });

  if (response.stop_reason === 'refusal') {
    return {
      text: 'Su questo preferisco non spingermi. Se vuoi, parliamo di cosa mangiare oggi o di come organizzare i prossimi pasti.',
      widgets: [],
      suggestions: ['Idee per il prossimo pasto', 'Com’è andata oggi?'],
      waterMl: 0,
      engine: 'claude',
    };
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text'
  );
  if (!textBlock) throw new Error(`Claude returned no text (stop_reason: ${response.stop_reason})`);
  const parsed = JSON.parse(textBlock.text) as Partial<AssistantTurn> & {
    water_ml?: number;
    profile_changes?: { field: string; value: string }[];
    memory_add?: { kind: string; text: string }[];
    memory_forget?: string[];
  };
  return {
    ...sanitize(parsed, ctx),
    waterMl: Math.max(0, Math.round(parsed.water_ml ?? 0)),
    profilePatch: toPatch(parsed.profile_changes ?? []),
    memory: ctx.memoryOn ? toMemory(parsed.memory_add, parsed.memory_forget) : undefined,
    engine: 'claude',
  };
}

const GOALS: Goal[] = ['lose', 'energy', 'gain', 'maintain'];
const DIETS: Diet[] = ['omnivore', 'vegetarian', 'vegan', 'pescatarian'];
const ACTIVITIES: Activity[] = ['low', 'medium', 'high'];

/** Turns Claude's `profile_changes` list into a validated patch (unknown values are dropped). */
function toPatch(changes: { field: string; value: string }[]): ProfilePatch | undefined {
  const p: ProfilePatch = {};
  const avoid = (v: string) =>
    AVOID_OPTIONS.find((a) => a.toLowerCase() === v.trim().toLowerCase());
  for (const { field, value } of changes) {
    const num = Number(String(value).replace(',', '.'));
    if (field === 'goal' && GOALS.includes(value as Goal)) p.goal = value as Goal;
    if (field === 'diet' && DIETS.includes(value as Diet)) p.diet = value as Diet;
    if (field === 'activity' && ACTIVITIES.includes(value as Activity))
      p.activity = value as Activity;
    if (field === 'weight' && Number.isFinite(num)) p.weight = num;
    if (field === 'protein_factor' && Number.isFinite(num)) p.proteinFactor = num;
    if (field === 'kcal_factor' && Number.isFinite(num)) p.kcalFactor = num;
    if (field === 'avoid_add' && avoid(value)) p.avoidAdd = [...(p.avoidAdd ?? []), avoid(value)!];
    if (field === 'avoid_remove' && avoid(value))
      p.avoidRemove = [...(p.avoidRemove ?? []), avoid(value)!];
  }
  return Object.keys(p).length ? p : undefined;
}

const KINDS: MemoryKind[] = ['like', 'dislike', 'note'];

function toMemory(
  add: { kind: string; text: string }[] = [],
  forget: string[] = []
): MemoryOps | undefined {
  const ops: MemoryOps = {
    add: add
      .filter((a) => KINDS.includes(a.kind as MemoryKind) && typeof a.text === 'string')
      .map((a) => ({ kind: a.kind as MemoryKind, text: a.text.trim().slice(0, 60) }))
      .filter((a) => a.text.length > 1)
      .slice(0, 5),
    forget: forget.filter((f) => typeof f === 'string' && f.trim()).slice(0, 5),
  };
  return ops.add?.length || ops.forget?.length ? ops : undefined;
}

interface RawPlan {
  start?: string;
  focus?: string;
  days?: {
    meals?: {
      label: string;
      title: string;
      emoji: string;
      minutes: number;
      kcal: number;
      protein: number;
      carbs: number;
      fat: number;
    }[];
  }[];
}

interface RawFacts {
  name?: string;
  brand?: string;
  emoji?: string;
  portion_label?: string;
  portion_g?: number;
  kcal_100g?: number;
  protein_100g?: number;
  carbs_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  sugars_100g?: number;
  salt_100g?: number;
}

const LABELS: MealLabel[] = ['Colazione', 'Pranzo', 'Spuntino', 'Cena'];
const FOCUS: PlanFocus[] = ['balanced', 'protein', 'quick', 'light'];

function toPlan(raw: RawPlan, n: (v: unknown) => number): MealPlan | null {
  const start = new Date();
  if (raw.start === 'tomorrow') start.setDate(start.getDate() + 1);
  const days = (raw.days ?? []).slice(0, 7).map((d, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return {
      date: dayKey(date),
      meals: (d.meals ?? [])
        .filter((m) => m?.title && LABELS.includes(m.label as MealLabel))
        .slice(0, 5)
        .map((m) => ({
          label: m.label as MealLabel,
          title: m.title,
          emoji: m.emoji || '🍽️',
          minutes: Math.round(n(m.minutes)),
          servings: 1,
          kcal: Math.round(n(m.kcal)),
          protein: Math.round(n(m.protein) * 10) / 10,
          carbs: Math.round(n(m.carbs) * 10) / 10,
          fat: Math.round(n(m.fat) * 10) / 10,
        })),
    };
  });
  if (!days.some((d) => d.meals.length)) return null;
  return {
    id: uid(),
    kind: days.length > 1 ? 'week' : 'day',
    focus: FOCUS.includes(raw.focus as PlanFocus) ? (raw.focus as PlanFocus) : 'balanced',
    createdAt: new Date().toISOString(),
    days,
  };
}

interface RawWorkout {
  mode?: string;
  goal?: string;
  level?: number;
  days?: number;
  equipment?: string;
  minutes?: number;
  session?: string;
}

interface RawExercise {
  id?: string;
  name?: string;
  muscles?: string[];
  equipment?: string[];
  steps?: string[];
  tips?: string[];
  mistakes?: string[];
  dose?: string;
}

const TRAINING_GOALS: TrainingGoal[] = ['strength', 'muscle', 'fat_loss', 'fitness'];

/** Claude picks the parameters; the routine itself comes from the app's catalogue. */
function toWorkoutPlan(raw: RawWorkout, ctx: BrainContext): WorkoutPlan | null {
  const current = ctx.training.enabled ? ctx.workoutPlan : null;
  if (raw.mode === 'current' && current) return current;
  const base: TrainingSetup = current?.setup ??
    ctx.training.setup ?? { goal: 'fitness', level: 1, days: 3, equipment: 'none', minutes: 30 };
  const clamp = (v: unknown, lo: number, hi: number, d: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d;
  const minutes = clamp(raw.minutes, 20, 60, base.minutes);
  const setup: TrainingSetup = {
    goal: TRAINING_GOALS.includes(raw.goal as TrainingGoal)
      ? (raw.goal as TrainingGoal)
      : base.goal,
    level: clamp(raw.level, 1, 3, base.level) as 1 | 2 | 3,
    days: clamp(raw.days, 2, 6, base.days),
    equipment: ['none', 'home', 'gym'].includes(raw.equipment ?? '')
      ? (raw.equipment as TrainingSetup['equipment'])
      : base.equipment,
    minutes: ([20, 30, 45, 60] as const).reduce((a, b) =>
      Math.abs(b - minutes) < Math.abs(a - minutes) ? b : a
    ),
  };
  return generateWorkoutPlan(setup);
}

/** A catalogue exercise keeps the app's own explanation; others use Claude's. */
function toExercise(raw: RawExercise, ctx: BrainContext) {
  const strings = (v: unknown, max: number) =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === 'string' && !!x).slice(0, max)
      : [];
  const e = raw.id ? exerciseById(raw.id) : undefined;
  if (e) {
    const plan = ctx.training.enabled ? ctx.workoutPlan : null;
    const inPlan = plan?.sessions.flatMap((s) => s.exercises).find((x) => x.id === e.id);
    const setup = plan?.setup ?? ctx.training.setup;
    const fallback = setup ? doseLabel(dose(e, setup, false)) : undefined;
    return exerciseCard(e, inPlan ? doseLabel(inPlan) : raw.dose || fallback);
  }
  const steps = strings(raw.steps, 6);
  if (!raw.name || !steps.length) return null;
  return {
    id: '',
    name: raw.name,
    muscles: strings(raw.muscles, 4),
    equipment: strings(raw.equipment, 3),
    steps,
    tips: strings(raw.tips, 3),
    mistakes: strings(raw.mistakes, 3),
    dose: raw.dose || undefined,
  };
}

/** Defensive pass: keep only widgets the UI knows how to draw, with sane numbers. */
function sanitize(raw: Partial<AssistantTurn>, ctx: BrainContext): AssistantTurn {
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0);
  const widgets: Widget[] = [];
  for (const w of raw.widgets ?? []) {
    switch (w?.type) {
      case 'meal_log':
        if (w.meal?.items?.length) {
          widgets.push({
            type: 'meal_log',
            meal: {
              ...w.meal,
              items: w.meal.items.map((i) => ({
                ...i,
                kcal: Math.round(n(i.kcal)),
                protein: n(i.protein),
                carbs: n(i.carbs),
                fat: n(i.fat),
                confidence: Math.min(1, n(i.confidence)),
              })),
            },
          });
        }
        break;
      case 'ideas':
        if (w.ideas?.length) widgets.push(w);
        break;
      case 'recipe':
        if (w.recipe?.title) widgets.push(w);
        break;
      case 'grocery':
        if (w.sections?.length)
          widgets.push({
            type: 'grocery',
            sections: w.sections.map((sec) => ({
              title: sec.title,
              items: sec.items.map((raw) => {
                const it = entryOf(raw);
                return { name: it.name, qty: it.qty || undefined, note: it.note || undefined };
              }),
            })),
          });
        break;
      case 'goal':
      case 'insight':
      case 'swap':
      case 'macros':
      case 'water':
      case 'week':
        widgets.push(w);
        break;
      case 'meal_plan': {
        const plan = toPlan(w as unknown as RawPlan, n);
        if (plan) widgets.push({ type: 'meal_plan', plan });
        break;
      }
      case 'workout_plan': {
        const plan = toWorkoutPlan(w as unknown as RawWorkout, ctx);
        if (plan) {
          const r = w as unknown as RawWorkout;
          const session = plan.sessions.find((x) => x.id === r.session)?.id;
          widgets.push({ type: 'workout_plan', plan, sessionId: session });
        }
        break;
      }
      case 'exercise': {
        const card = toExercise(w as unknown as RawExercise, ctx);
        if (card) widgets.push({ type: 'exercise', exercise: card });
        break;
      }
      case 'exercises': {
        const r = w as unknown as { title?: string; ids?: string[] };
        const items = (r.ids ?? [])
          .map((id) => exerciseById(id))
          .filter((e) => e !== undefined)
          .slice(0, 6)
          .map((e) => ({ id: e.id, name: e.name, muscles: exerciseCard(e).muscles }));
        if (items.length) widgets.push({ type: 'exercises', title: r.title || 'Esercizi', items });
        break;
      }
      case 'food_facts': {
        const f = w as unknown as RawFacts;
        if (!f.name) break;
        widgets.push({
          type: 'food_facts',
          food: {
            id: `claude:${f.name}`,
            name: f.name,
            brand: f.brand?.trim() || undefined,
            emoji: f.emoji || '🍽️',
            source: 'claude',
            per100: {
              kcal: Math.round(n(f.kcal_100g)),
              protein: n(f.protein_100g),
              carbs: n(f.carbs_100g),
              fat: n(f.fat_100g),
              fiber: n(f.fiber_100g),
              sugars: n(f.sugars_100g),
              salt: n(f.salt_100g),
            },
            portion: {
              label: f.portion_label || `${Math.round(n(f.portion_g)) || 100} g`,
              grams: Math.round(n(f.portion_g)) || 100,
            },
          },
        });
        break;
      }
    }
  }
  return {
    text: typeof raw.text === 'string' ? raw.text : '',
    widgets,
    suggestions: (raw.suggestions ?? []).filter((s) => typeof s === 'string').slice(0, 3),
  };
}
