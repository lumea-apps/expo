/**
 * Training intents for the offline brain (the optional Allenamento module):
 * making or showing the routine, "cosa mi alleno oggi?", "ho fatto
 * l'allenamento", how an exercise is done and exercises for a muscle group.
 * Answers come from the exercise catalogue, so they are instant and offline.
 */
import {
  EQUIPMENT_SETTING,
  exerciseById,
  findExercise,
  muscleGroupIn,
  searchExercises,
  type EquipmentSetting,
  type Exercise,
} from '../exercises';
import { normalize } from '../foods';
import { joinList } from '../memory';
import { dayKey, formatKcal } from '../nutrition';
import type { AssistantTurn, TrainingGoal, TrainingSetup, WorkoutPlan } from '../types';
import {
  DEFAULT_SETUP,
  dose,
  doseLabel,
  exerciseCard,
  generateWorkoutPlan,
  nextSession,
  sessionKcal,
  sessionOn,
  setupSummary,
  WEEKDAY_LONG,
  weekStart,
} from '../workout';
import type { BrainContext, BrainReply } from './types';

export type TrainingTurn = AssistantTurn & { workoutDone?: BrainReply['workoutDone'] };

const PAIN_RE =
  /(male|dolor|infortun|ernia|lesion|tendin|incint|gravidanz|operat|cardiopat|pressione alta)/;
const SAFETY =
  'Se senti dolore (non fatica, dolore), fermati: meglio farlo vedere a un medico o a un fisioterapista prima di insistere.';

const REQUEST_RE =
  /(^(una )?scheda\b|(scheda|programma|piano|routine) (di |d |per l )?(allenamento|esercizi|palestra|workout)|allenamento settimanale|scheda (per |in |a )?(la )?(palestra|casa|corpo libero)|(fammi|fai|crea|creami|preparami|prepara|voglio|vorrei|dammi|mi serve) (una |la )?(nuova )?scheda|(nuova|rifai|rigenera|cambia|rifammi|ricrea) (la )?scheda|(la mia|mostrami la|fammi vedere la|apri la) scheda|workout plan)/;
const FRESH_RE = /(nuova|nuovo|rifai|rifammi|rigenera|cambia|un altra|diversa|ricrea|da capo)/;
const TODAY_RE =
  /((cosa|che cosa|che) (mi )?alleno|(che|quale) allenamento (faccio|ho|devo fare|tocca|c e)|allenamento (di )?(oggi|domani)|(oggi|domani) (mi )?alleno|(devo|dovrei) allenarmi|giorno di (allenamento|riposo)|cosa (faccio|tocca) in palestra|scheda di (oggi|domani))/;
const DONE_RE =
  /(ho (fatto|finito|completato|chiuso) (l |il mio |la mia |la |il )?(allenamento|workout|scheda|sessione|palestra|circuito)|mi sono allenat|allenamento (fatto|finito|completato)|sono (andat|stat)[oa] in palestra|appena allenat)/;
const EXPLAIN_RE =
  /(come (si )?(fa|fanno|esegue|eseguono|faccio|eseguo|fare)|spiegami|spiega|esecuzione|tecnica|cos e|cosa sono|cosa e|a cosa serve|che muscoli|quali muscoli|piu facile|piu difficile|variante|versione)/;
const SKIPPED_RE =
  /\bnon (ho (fatto|finito) (l |il |la )?(allenamento|workout|scheda|palestra)|mi sono allenat|sono (andat|stat)[oa] in palestra|riesco ad allenarmi|ce l ho fatta ad allenarmi)/;
const AROUND_RE =
  /(dopo|prima (del|dell|della|di)|post|pre) ?(l |la )?(allenamento|palestra|workout|allenarmi|correre|corsa)/;
const ACTIVITY_RE =
  /(ho (fatto|corso|camminato|pedalato|nuotato)|sono (andat|stat)[oa] a (correre|camminare|nuotare|fare)|ho fatto (una |un |la |il )?(camminata|passeggiata|corsa|corsetta|giro in bici|bici|cyclette|spinning))/;
const GROUP_RE = /(esercizi|allenar|allenamento|rinforzar|tonificar|rassodar|lavorare)/;

const NUMBER: Record<string, number> = { due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6 };

/** Setup asked for in a message, on top of the current (or profile-based) one. */
export function parseSetup(
  t: string,
  base: TrainingSetup
): { setup: TrainingSetup; said: boolean } {
  const s: TrainingSetup = { ...base };
  let said = false;
  const days = t.match(
    /\b([2-6]|due|tre|quattro|cinque|sei) (volte|giorni|allenamenti|sedute|sessioni)\b/
  );
  if (days) {
    s.days = Number(days[1]) || NUMBER[days[1]];
    said = true;
  }
  const min = t.match(/\b(\d{2,3}) ?(min|minuti)\b/);
  const minutes = min
    ? Number(min[1])
    : /mezz ora/.test(t)
      ? 30
      : /tre quarti d ora/.test(t)
        ? 45
        : /\bun ora\b/.test(t)
          ? 60
          : 0;
  if (minutes) {
    s.minutes = ([20, 30, 45, 60] as const).reduce((a, b) =>
      Math.abs(b - minutes) < Math.abs(a - minutes) ? b : a
    );
    said = true;
  }
  const equipment = equipmentIn(t);
  if (equipment) {
    s.equipment = equipment;
    said = true;
  }
  const level = /(principiant|inizio|mai allenat|da zero|poco allenat|fuori forma|ricominci)/.test(
    t
  )
    ? 1
    : /intermedi/.test(t)
      ? 2
      : /(avanzat|esperto|esperta)/.test(t)
        ? 3
        : 0;
  if (level) {
    s.level = level;
    said = true;
  }
  const goal: TrainingGoal | null = /(forza|piu forte)/.test(t)
    ? 'strength'
    : /(massa|muscol|ipertrofi)/.test(t)
      ? 'muscle'
      : /(dimagr|perdere peso|bruciare|grasso|definizione)/.test(t)
        ? 'fat_loss'
        : /(in forma|salute|resistenza|stare bene|tonic)/.test(t)
          ? 'fitness'
          : null;
  if (goal) {
    s.goal = goal;
    said = true;
  }
  return { setup: s, said };
}

function equipmentIn(t: string): EquipmentSetting | null {
  if (/palestra/.test(t)) return 'gym';
  if (/(corpo libero|senza attrezzi|niente attrezzi|nessun attrezzo)/.test(t)) return 'none';
  if (/(manubri|elastic|kettlebell|con (gli |degli |qualche )?attrezzi)/.test(t)) return 'home';
  if (/(a casa|in casa)/.test(t)) return 'none';
  return null;
}

/** The starting point: the saved setup, else one guessed from the nutrition profile. */
function baseSetup(ctx: BrainContext): TrainingSetup {
  if (ctx.training.setup) return ctx.training.setup;
  const goal: TrainingGoal =
    ctx.profile.goal === 'lose' ? 'fat_loss' : ctx.profile.goal === 'gain' ? 'muscle' : 'fitness';
  return { ...DEFAULT_SETUP, goal, level: ctx.profile.activity === 'high' ? 2 : 1 };
}

const activePlan = (ctx: BrainContext): WorkoutPlan | null =>
  ctx.training.enabled ? ctx.workoutPlan : null;

/**
 * Training commands answered locally with either engine: the routine, today's
 * session, logging a session and plain "how is X done" questions.
 * `quick` = called before Claude, so anything nuanced is left to it.
 */
export function trainingTurn(raw: string, ctx: BrainContext, quick: boolean): TrainingTurn | null {
  const t = normalize(raw);
  const pain = PAIN_RE.test(t);
  const negated = /\bnon (ho|mi sono|sono|riesco)\b/.test(t);

  if (SKIPPED_RE.test(t)) return skippedTurn(ctx);
  if (DONE_RE.test(t) && !negated) return doneTurn(ctx);
  if (REQUEST_RE.test(t) && !(quick && pain)) return routineTurn(t, ctx);
  if (TODAY_RE.test(t)) return todayTurn(t, ctx);

  const exercise = findExercise(raw);
  if (exercise && EXPLAIN_RE.test(t)) {
    if (quick && (pain || /(posso|meglio|differenza|invece|oppure|quant[ei]|quanto)/.test(t)))
      return null;
    return explainTurn(exercise, ctx, pain);
  }
  const group = GROUP_RE.test(t) ? muscleGroupIn(t) : undefined;
  if (group && !(quick && pain)) return groupTurn(group, t, ctx);
  if (quick) return null;
  if (ACTIVITY_RE.test(t) && !negated) {
    const cardio = exercise?.pattern === 'cardio' ? exercise : cardioIn(t);
    if (cardio) return activityTurn(cardio, t, ctx);
  }
  if (exercise && (t.split(' ').length <= 4 || /(serie|ripetizion|quant[ei]|posso|meglio)/.test(t)))
    return explainTurn(exercise, ctx, pain, /(serie|ripetizion|quant[ei])/.test(t));
  if (AROUND_RE.test(t) && /(mangi|pasto|spuntino|protein|carboidrat|cosa|quanto)/.test(t))
    return fuelTurn(t, ctx);
  return null;
}

function routineTurn(t: string, ctx: BrainContext): TrainingTurn {
  const current = activePlan(ctx);
  const { setup, said } = parseSetup(t, baseSetup(ctx));
  const fresh =
    FRESH_RE.test(t) || (said && JSON.stringify(setup) !== JSON.stringify(current?.setup));
  if (current && !fresh) {
    const today = sessionOn(current);
    const next = today ? null : nextSession(current, new Date(), true);
    return {
      text: `La tua scheda ce l’hai già: ${setupSummary(current.setup)}. ${
        today
          ? `Oggi tocca **${today.name}**.`
          : next
            ? `Oggi è giorno di riposo, il prossimo è ${WEEKDAY_LONG[next.session.weekday]}: **${next.session.name}**.`
            : ''
      } Se la vuoi diversa, dimmi *«rifai la scheda»* o cosa cambiare.`,
      widgets: [{ type: 'workout_plan', plan: current, sessionId: today?.id }],
      suggestions: ['Cosa mi alleno oggi?', 'Rifai la scheda', 'Come si fa lo squat?'],
    };
  }
  const plan = generateWorkoutPlan(setup);
  const names = plan.sessions.map((s) => `${WEEKDAY_LONG[s.weekday]} ${s.name}`);
  const today = sessionOn(plan);
  return {
    text: `Ecco la tua scheda: **${plan.sessions.length} allenamenti a settimana** (${names.join(', ')}), circa ${setup.minutes} minuti l’uno. ${
      today ? `Si parte oggi con **${today.name}**.` : ''
    } Tocca un esercizio per sapere come si fa.`
      .replace(/\s+/g, ' ')
      .trim(),
    widgets: [{ type: 'workout_plan', plan, sessionId: today?.id }],
    suggestions: [
      'Cosa mi alleno oggi?',
      setup.equipment === 'gym' ? 'Scheda a corpo libero' : 'Scheda per la palestra',
      'Quanto mangiare dopo l’allenamento?',
    ],
  };
}

function noPlanTurn(): TrainingTurn {
  return {
    text: 'Non hai ancora una scheda di allenamento: è facoltativa, ma se vuoi te la preparo in un attimo. Dimmi quante volte a settimana e se ti alleni a casa o in palestra.',
    widgets: [],
    suggestions: [
      'Scheda 3 volte a corpo libero',
      'Scheda per la palestra',
      'Esercizi per i glutei',
    ],
  };
}

function todayTurn(t: string, ctx: BrainContext): TrainingTurn {
  const plan = activePlan(ctx);
  if (!plan) return noPlanTurn();
  const tomorrow = /domani/.test(t);
  const date = new Date();
  if (tomorrow) date.setDate(date.getDate() + 1);
  const session = sessionOn(plan, date);
  const when = tomorrow ? 'Domani' : 'Oggi';
  if (!session) {
    const next = nextSession(plan, date, true);
    return {
      text: `${when} è giorno di riposo: il recupero fa parte dell’allenamento. ${
        next
          ? `Il prossimo è ${WEEKDAY_LONG[next.session.weekday]}: **${next.session.name}** (${next.session.minutes} min).`
          : ''
      } Una passeggiata va sempre bene.`,
      widgets: next ? [{ type: 'workout_plan', plan, sessionId: next.session.id }] : [],
      suggestions: ['Mostrami la scheda', 'Esercizi per l’addome', 'Com’è andata oggi?'],
    };
  }
  const done = ctx.workoutLog.some(
    (l) => l.date === dayKey(date) && l.planId === plan.id && l.sessionId === session.id
  );
  const kcal = sessionKcal(session, ctx.profile.weight ?? 70);
  return {
    text: done
      ? `${when} hai già fatto **${session.name}**: ottimo lavoro. Adesso recupero e un pasto con proteine.`
      : `${when} tocca **${session.name}**: ${session.exercises.length} esercizi, circa ${session.minutes} minuti e ~${formatKcal(kcal)} kcal. Scalda 5 minuti prima di iniziare.`,
    widgets: [{ type: 'workout_plan', plan, sessionId: session.id }],
    suggestions: done
      ? ['Idee per un pasto proteico', 'Cosa mi alleno domani?']
      : ['Ho fatto l’allenamento', `Spiegami: ${session.exercises[0]?.name ?? 'Squat'}`],
  };
}

function doneTurn(ctx: BrainContext): TrainingTurn {
  const plan = activePlan(ctx);
  if (!plan) {
    return {
      text: 'Grande, ben fatto! Dopo l’allenamento punta a un pasto con 25–30 g di proteine e un po’ di carboidrati. Se vuoi, ti preparo una scheda così tengo il conto delle sessioni.',
      widgets: [],
      suggestions: ['Fammi una scheda di allenamento', 'Idee per un pasto proteico'],
    };
  }
  const today = dayKey();
  const from = weekStart();
  const doneWeek = new Set(
    ctx.workoutLog.filter((l) => l.date >= from && l.planId === plan.id).map((l) => l.sessionId)
  );
  // today's session, else the first one not done yet this week
  const session =
    sessionOn(plan) ?? plan.sessions.find((s) => !doneWeek.has(s.id)) ?? plan.sessions[0];
  const already = ctx.workoutLog.some(
    (l) => l.date === today && l.planId === plan.id && l.sessionId === session.id
  );
  const kcal = sessionKcal(session, ctx.profile.weight ?? 70);
  const count = doneWeek.size + (doneWeek.has(session.id) ? 0 : 1);
  const P = Math.round(ctx.profile.targets.protein * 0.25);
  return {
    text: already
      ? `L’avevo già segnato: **${session.name}** fatto oggi. Ora recupera bene.`
      : `Segnato: **${session.name}**, circa **${formatKcal(kcal)} kcal** in ${session.minutes} minuti. Siamo a **${count} su ${plan.sessions.length}** questa settimana.`,
    widgets: already
      ? []
      : [
          {
            type: 'insight',
            tone: 'positive',
            title: 'Dopo l’allenamento',
            body: `Nelle prossime ore un pasto con ${Math.max(20, Math.min(40, P))} g di proteine e dei carboidrati aiuta il recupero. E un bicchiere d’acqua in più.`,
          },
        ],
    suggestions: ['Idee per un pasto proteico', 'Cosa mi alleno domani?', 'Ho bevuto mezzo litro'],
    workoutDone: already ? undefined : { planId: plan.id, sessionId: session.id },
  };
}

function explainTurn(
  e: Exercise,
  ctx: BrainContext,
  pain: boolean,
  askedDose = false
): TrainingTurn {
  const plan = activePlan(ctx);
  const inPlan = plan?.sessions.flatMap((s) => s.exercises).find((x) => x.id === e.id);
  const dosing = inPlan
    ? doseLabel(inPlan)
    : doseLabel(dose(e, ctx.training.setup ?? baseSetup(ctx), false));
  const easier = e.easier ? exerciseById(e.easier) : undefined;
  const harder = e.harder ? exerciseById(e.harder) : undefined;
  return {
    text: `${
      pain
        ? `${SAFETY} Intanto ecco come si fa **${e.name}**${easier ? `, e c’è anche una versione più facile` : ''}.`
        : askedDose
          ? `Per te: **${dosing}**${inPlan ? ', come nella tua scheda' : ''}, con l’ultima ripetizione fatica ma tecnica pulita.`
          : `Ecco come si fa **${e.name}**: lavora soprattutto ${joinList(
              exerciseCard(e)
                .muscles.slice(0, 2)
                .map((m) => m.toLowerCase())
            )}.`
    } ${inPlan && !askedDose ? `Nella tua scheda: **${dosing}**.` : ''}`
      .replace(/\s+/g, ' ')
      .trim(),
    widgets: [{ type: 'exercise', exercise: exerciseCard(e, dosing) }],
    suggestions: [
      easier ? `Più facile: ${easier.name}` : harder ? `Più difficile: ${harder.name}` : '',
      plan ? 'Cosa mi alleno oggi?' : 'Fammi una scheda di allenamento',
    ].filter(Boolean),
  };
}

function groupTurn(
  group: NonNullable<ReturnType<typeof muscleGroupIn>>,
  t: string,
  ctx: BrainContext
): TrainingTurn {
  const setting = equipmentIn(t) ?? ctx.training.setup?.equipment;
  const level = ctx.training.setup?.level ?? 1;
  const items = searchExercises('', { muscles: group.muscles, setting })
    .map((e) => ({
      e,
      score:
        (group.muscles.includes(e.muscles[0]) ? 2 : 0) -
        Math.max(0, e.level - level) * 1.5 -
        Math.abs(e.level - level) * 0.3,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ e }) => ({ id: e.id, name: e.name, muscles: exerciseCard(e).muscles }));
  const where = setting ? EQUIPMENT_SETTING[setting].label.toLowerCase() : '';
  return {
    text: `Per ${group.label.toLowerCase()}${where ? ` (${where})` : ''} partirei da questi. Tocca un esercizio per vedere come si fa.${
      PAIN_RE.test(t) ? ` ${SAFETY}` : ''
    }`,
    widgets: [
      {
        type: 'exercises',
        title: `${group.label}${where ? ` · ${where}` : ''}`,
        items,
      },
    ],
    suggestions: [
      items[0] ? `Spiegami: ${items[0].name}` : 'Fammi una scheda',
      activePlan(ctx) ? 'Cosa mi alleno oggi?' : 'Fammi una scheda di allenamento',
    ],
  };
}

function skippedTurn(ctx: BrainContext): TrainingTurn {
  const plan = activePlan(ctx);
  const next = plan ? nextSession(plan, new Date(), true) : null;
  return {
    text: `Nessun problema: una seduta saltata non cambia niente, conta la settimana. ${
      next ? `La prossima è ${WEEKDAY_LONG[next.session.weekday]}: **${next.session.name}**.` : ''
    } Se hai 20 minuti, una camminata veloce oggi fa comunque bene.`
      .replace(/\s+/g, ' ')
      .trim(),
    widgets: [],
    suggestions: plan
      ? ['Cosa mi alleno domani?', 'Esercizi per l’addome']
      : ['Fammi una scheda di allenamento', 'Com’è andata oggi?'],
  };
}

/** "Ho fatto 30 minuti di camminata": kcal estimate (the diary is for food; sessions come from the scheda). */
function activityTurn(e: Exercise, t: string, ctx: BrainContext): TrainingTurn {
  const kg = ctx.profile.weight ?? 70;
  const min = t.match(/\b(\d{1,3}) ?(min|minuti)\b/);
  const hours = t.match(/\b(un|una|1|2|due) or[ae]\b/);
  const km = t.match(/\b(\d{1,2}(?:[.,]\d)?) ?(km|chilometri)\b/);
  const minutes = min
    ? Number(min[1])
    : hours
      ? (Number(hours[1]) || (/(due)/.test(hours[1]) ? 2 : 1)) * 60
      : km
        ? Number(km[1].replace(',', '.')) * (e.id === 'corsa' ? 6 : e.id === 'cyclette' ? 3 : 12)
        : 30;
  const kcal = Math.round((e.met * kg * minutes) / 60 / 5) * 5;
  return {
    text: `Bene! ${min || hours || km ? '' : 'Se è stata circa mezz’ora, '}${Math.round(minutes)} minuti di ${e.name.toLowerCase()} valgono circa **${formatKcal(kcal)} kcal**. Non serve “recuperarle” mangiando di più: se hai fame, uno spuntino con proteine va benissimo.`,
    widgets: [],
    suggestions: ['Idee per uno spuntino proteico', 'Ho bevuto mezzo litro', 'Com’è andata oggi?'],
  };
}

function cardioIn(t: string): Exercise | undefined {
  if (/(cors[oa]|correre|corsetta)/.test(t)) return exerciseById('corsa');
  if (/(camminat|passeggiat)/.test(t)) return exerciseById('camminata-veloce');
  if (/(pedalat|bici|cyclette|spinning)/.test(t)) return exerciseById('cyclette');
  return undefined;
}

/** "Cosa mangio dopo l'allenamento?" */
function fuelTurn(t: string, ctx: BrainContext): TrainingTurn {
  const kg = ctx.profile.weight ?? 70;
  const protein = Math.round((kg * 0.3) / 5) * 5;
  const before = /(prima|pre)/.test(t) && !/(dopo|post)/.test(t);
  return before
    ? {
        text: 'Prima di allenarti: qualcosa di leggero con carboidrati, 60–90 minuti prima. Niente di pesante o troppo grasso.',
        widgets: [
          {
            type: 'insight',
            tone: 'neutral',
            title: 'Prima dell’allenamento',
            body: 'Una banana, uno yogurt con cereali o una fetta di pane con marmellata. Se ti alleni appena sveglio, anche solo acqua e un frutto.',
          },
        ],
        suggestions: ['E dopo l’allenamento?', 'Cosa mi alleno oggi?'],
      }
    : {
        text: `Dopo l’allenamento punta a **${protein} g di proteine** e una quota di carboidrati nelle 2 ore successive: aiutano il recupero, non “annullano” la seduta.`,
        widgets: [
          {
            type: 'insight',
            tone: 'positive',
            title: 'Il pasto dopo',
            body: 'Yogurt greco e frutta, un toast con uova, pasta con tonno o legumi, riso con pollo. E acqua: almeno un paio di bicchieri in più.',
          },
        ],
        suggestions: ['Idee per un pasto proteico', 'Ho bevuto mezzo litro'],
      };
}

/** One line for the morning brief when the module is on. */
export function trainingBriefLine(ctx: BrainContext): string {
  const plan = activePlan(ctx);
  if (!plan) return '';
  const s = sessionOn(plan);
  return s
    ? `Oggi in programma c’è anche **${s.name}** (${s.minutes} min).`
    : 'Oggi niente allenamento: giorno di recupero.';
}
