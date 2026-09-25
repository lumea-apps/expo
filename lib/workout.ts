import {
  canDo,
  EQUIPMENT_LABELS,
  EXERCISES,
  exerciseById,
  MUSCLE_LABELS,
  type Exercise,
  type Muscle,
  type Pattern,
} from './exercises';
import { dayKey, uid } from './nutrition';
import type {
  ExerciseCard,
  TrainingGoal,
  TrainingSetup,
  WorkoutExercise,
  WorkoutPlan,
  WorkoutSession,
} from './types';

/**
 * Weekly routines ("schede") built from the exercise catalogue: a split that
 * fits the days per week, one exercise per movement slot chosen for the
 * equipment and level, sets and reps for the goal, trimmed to the minutes
 * available.
 */

export const GOAL_LABELS: Record<TrainingGoal, string> = {
  strength: 'Forza',
  muscle: 'Massa muscolare',
  fat_loss: 'Dimagrire',
  fitness: 'Tenermi in forma',
};

export const GOAL_HINTS: Record<TrainingGoal, string> = {
  strength: 'Poche ripetizioni, carichi alti, recuperi lunghi',
  muscle: '8–12 ripetizioni, volume medio-alto',
  fat_loss: 'Circuiti con recuperi brevi e un finale cardio',
  fitness: 'Un po’ di tutto, senza stress',
};

export const DEFAULT_SETUP: TrainingSetup = {
  goal: 'fitness',
  level: 1,
  days: 3,
  equipment: 'none',
  minutes: 30,
};

interface Template {
  name: string;
  slots: Pattern[];
}

const FULL_A: Template = {
  name: 'Total body A',
  slots: ['squat', 'push_h', 'hinge', 'pull_h', 'push_v', 'core'],
};
const FULL_B: Template = {
  name: 'Total body B',
  slots: ['lunge', 'push_v', 'glutes', 'pull_v', 'push_h', 'core'],
};
const FULL_C: Template = {
  name: 'Total body C',
  slots: ['squat', 'push_h', 'hinge', 'pull_v', 'shoulders', 'core'],
};
const UPPER_A: Template = {
  name: 'Parte alta A',
  slots: ['push_h', 'pull_h', 'push_v', 'pull_v', 'biceps', 'triceps'],
};
const UPPER_B: Template = {
  name: 'Parte alta B',
  slots: ['pull_v', 'push_h', 'pull_h', 'shoulders', 'triceps', 'biceps'],
};
const LOWER_A: Template = {
  name: 'Gambe e glutei A',
  slots: ['squat', 'hinge', 'lunge', 'legs_iso', 'calves', 'core'],
};
const LOWER_B: Template = {
  name: 'Gambe e glutei B',
  slots: ['hinge', 'lunge', 'glutes', 'squat', 'calves', 'core'],
};
const PUSH: Template = {
  name: 'Spinta',
  slots: ['push_h', 'push_v', 'push_h', 'shoulders', 'triceps', 'core'],
};
const PULL: Template = {
  name: 'Tirata',
  slots: ['pull_v', 'pull_h', 'pull_h', 'shoulders', 'biceps', 'core'],
};
const LEGS: Template = {
  name: 'Gambe',
  slots: ['squat', 'hinge', 'lunge', 'glutes', 'calves', 'core'],
};

const SPLITS: Record<number, { templates: Template[]; weekdays: number[] }> = {
  2: { templates: [FULL_A, FULL_B], weekdays: [1, 4] },
  3: { templates: [FULL_A, FULL_B, FULL_C], weekdays: [1, 3, 5] },
  4: { templates: [UPPER_A, LOWER_A, UPPER_B, LOWER_B], weekdays: [1, 2, 4, 5] },
  5: { templates: [UPPER_A, LOWER_A, PUSH, PULL, LEGS], weekdays: [1, 2, 3, 5, 6] },
  6: {
    templates: [
      PUSH,
      PULL,
      LEGS,
      { ...PUSH, name: 'Spinta B' },
      { ...PULL, name: 'Tirata B' },
      { ...LEGS, name: 'Gambe B' },
    ],
    weekdays: [1, 2, 3, 4, 5, 6],
  },
};

// when the equipment has nothing for a slot (no bar for pull-ups at home…)
const FALLBACK: Partial<Record<Pattern, Pattern[]>> = {
  pull_v: ['pull_h'],
  pull_h: ['pull_v'],
  legs_iso: ['lunge', 'glutes'],
  glutes: ['hinge', 'lunge'],
  hinge: ['glutes'],
  shoulders: ['push_v'],
  biceps: ['pull_h'],
  triceps: ['push_h'],
  calves: ['lunge'],
  push_v: ['push_h'],
};

const COMPOUND = new Set<Pattern>([
  'squat',
  'hinge',
  'push_h',
  'push_v',
  'pull_h',
  'pull_v',
  'lunge',
]);

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

function candidates(pattern: Pattern, setup: TrainingSetup): Exercise[] {
  return EXERCISES.filter(
    (e) => e.pattern === pattern && canDo(e, setup.equipment) && e.level <= setup.level + 1
  );
}

function pick(
  pattern: Pattern,
  setup: TrainingSetup,
  used: Map<string, number>,
  inSession: Set<string>,
  random: () => number
): Exercise | null {
  for (const p of [pattern, ...(FALLBACK[pattern] ?? [])]) {
    const list = candidates(p, setup).filter((e) => !inSession.has(e.id));
    if (!list.length) continue;
    return list
      .map((e) => {
        // easier ones are fine, a step up only when nothing else fits
        let score =
          e.level <= setup.level ? -(setup.level - e.level) * 0.5 : -(e.level - setup.level) * 3;
        score -= (used.get(e.id) ?? 0) * 1.2; // variety across the week
        // use what's there: in a gym the bar and machines, at home the dumbbells
        const light = e.equipment.every((x) => x === 'corpo' || x === 'elastico');
        if (setup.equipment === 'gym' && light && e.pattern !== 'core' && e.pattern !== 'cardio')
          score -= 1.6;
        if (setup.equipment === 'home' && e.equipment.includes('corpo')) score -= 0.3;
        if (setup.goal === 'fat_loss' && e.met >= 6) score += 0.8;
        score += random();
        return { e, score };
      })
      .sort((a, b) => b.score - a.score)[0].e;
  }
  return null;
}

/** Sets, reps and rest for an exercise, from the goal and level. */
export function dose(
  e: Exercise,
  setup: TrainingSetup,
  main: boolean
): Omit<WorkoutExercise, 'id' | 'name'> {
  if (e.unit === 'minuti') {
    const m = setup.goal === 'fat_loss' ? '10–12 min' : '8–10 min';
    return { sets: 1, reps: m, rest: 0, note: 'A ritmo sostenuto ma parlabile' };
  }
  if (e.unit === 'secondi') {
    const s = setup.level === 1 ? 30 : setup.level === 2 ? 45 : 60;
    return {
      sets: 3,
      reps: `${setup.goal === 'fat_loss' ? s - 10 : s} s`,
      rest: setup.goal === 'fat_loss' ? 20 : 45,
    };
  }
  const beginner = setup.level === 1 ? -1 : 0;
  switch (setup.goal) {
    case 'strength':
      return main && COMPOUND.has(e.pattern)
        ? { sets: 4 + beginner, reps: '5–6', rest: 150, note: 'Carico impegnativo, tecnica pulita' }
        : { sets: 3, reps: '8–10', rest: 90 };
    case 'muscle':
      return {
        sets: (main ? 4 : 3) + beginner,
        reps: COMPOUND.has(e.pattern) ? '8–12' : '10–15',
        rest: main ? 90 : 60,
      };
    case 'fat_loss':
      return { sets: 3, reps: '12–15', rest: 40 };
    default:
      return { sets: 3 + (beginner && !main ? -1 : 0), reps: '10–12', rest: 60 };
  }
}

/** Rough minutes: warm-up + ~40 s per set + rests. */
function minutesOf(list: WorkoutExercise[]): number {
  const seconds = list.reduce((a, x) => {
    const work = /min/.test(x.reps) ? parseInt(x.reps, 10) * 60 : 40;
    return a + x.sets * work + Math.max(0, x.sets - 1) * x.rest + 30;
  }, 0);
  return Math.round(5 + seconds / 60);
}

function focusOf(list: WorkoutExercise[]): string {
  const muscles: Muscle[] = [];
  for (const x of list) {
    const e = exerciseById(x.id);
    const m = e?.muscles[0];
    if (m && !muscles.includes(m)) muscles.push(m);
  }
  return muscles
    .slice(0, 4)
    .map((m) => MUSCLE_LABELS[m])
    .join(', ');
}

const toItem = (e: Exercise, setup: TrainingSetup, main: boolean): WorkoutExercise => ({
  id: e.id,
  name: e.name,
  ...dose(e, setup, main),
});

export function generateWorkoutPlan(setup: TrainingSetup, seed = Date.now()): WorkoutPlan {
  const days = Math.min(6, Math.max(2, Math.round(setup.days)));
  const split = SPLITS[days];
  const random = mulberry32(seed);
  const used = new Map<string, number>();

  const sessions: WorkoutSession[] = split.templates.map((tpl, i) => {
    const inSession = new Set<string>();
    let list: WorkoutExercise[] = [];
    tpl.slots.forEach((slot, j) => {
      const e = pick(slot, setup, used, inSession, random);
      if (!e) return;
      inSession.add(e.id);
      used.set(e.id, (used.get(e.id) ?? 0) + 1);
      list.push(toItem(e, setup, j < 2));
    });
    // longer sessions: one more accessory while there is clearly time
    const lower = !tpl.slots.includes('push_h') && !tpl.slots.includes('pull_v');
    const upper = !tpl.slots.includes('squat') && !tpl.slots.includes('hinge');
    const extras: Pattern[] = lower
      ? ['core', 'glutes', 'calves']
      : upper
        ? ['core', 'shoulders', 'biceps', 'triceps']
        : ['core', 'shoulders'];
    for (const extra of extras) {
      if (minutesOf(list) > setup.minutes * 0.7) break;
      const has = list.some((x) => exerciseById(x.id)?.pattern === extra);
      if (has && extra === 'core') continue;
      const e = pick(extra, setup, used, inSession, random);
      if (!e || e.pattern !== extra) continue;
      inSession.add(e.id);
      used.set(e.id, (used.get(e.id) ?? 0) + 1);
      list.push(toItem(e, setup, false));
    }
    // a short cardio finish helps when the goal is losing weight
    if (setup.goal === 'fat_loss') {
      const c = pick('cardio', setup, used, inSession, random);
      if (c) list.push(toItem(c, setup, false));
    }
    // fit the time: drop accessories from the end, keep at least three exercises
    while (list.length > 3 && minutesOf(list) > setup.minutes) {
      const idx = [...list]
        .reverse()
        .findIndex((x) => !COMPOUND.has(exerciseById(x.id)?.pattern ?? 'core'));
      list = list.filter((_, k) => k !== (idx === -1 ? list.length - 1 : list.length - 1 - idx));
    }
    return {
      id: String.fromCharCode(65 + i),
      name: tpl.name,
      focus: focusOf(list),
      weekday: split.weekdays[i],
      minutes: minutesOf(list),
      exercises: list,
    };
  });

  return { id: uid(), createdAt: new Date().toISOString(), setup: { ...setup, days }, sessions };
}

/** Another exercise for the same slot (same movement, still doable with the equipment). */
export function swapWorkoutExercise(
  plan: WorkoutPlan,
  sessionId: string,
  index: number
): WorkoutPlan {
  const session = plan.sessions.find((s) => s.id === sessionId);
  const current = session?.exercises[index];
  const e = current ? exerciseById(current.id) : undefined;
  if (!session || !current || !e) return plan;
  const inSession = new Set(session.exercises.map((x) => x.id));
  const options = candidates(e.pattern, plan.setup).filter((x) => !inSession.has(x.id));
  if (!options.length) return plan;
  const next = options[Math.floor(Math.random() * options.length)];
  const item = { ...toItem(next, plan.setup, index < 2), sets: current.sets };
  return {
    ...plan,
    sessions: plan.sessions.map((s) =>
      s.id === sessionId
        ? { ...s, exercises: s.exercises.map((x, i) => (i === index ? item : x)) }
        : s
    ),
  };
}

export function sessionOn(plan: WorkoutPlan, date: Date = new Date()): WorkoutSession | undefined {
  return plan.sessions.find((s) => s.weekday === date.getDay());
}

/** The next session from `from` (today included), with its date. */
export function nextSession(
  plan: WorkoutPlan,
  from: Date = new Date(),
  skipToday = false
): { session: WorkoutSession; date: string } | null {
  for (let i = skipToday ? 1 : 0; i < 8; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const s = sessionOn(plan, d);
    if (s) return { session: s, date: dayKey(d) };
  }
  return null;
}

/** kcal for a session: average MET × body weight × hours. */
export function sessionKcal(session: WorkoutSession, weightKg = 70): number {
  const mets = session.exercises.map((x) => exerciseById(x.id)?.met ?? 5);
  const avg = mets.reduce((a, b) => a + b, 0) / Math.max(1, mets.length);
  return Math.round(avg * weightKg * (session.minutes / 60));
}

/** Day key of this week's Monday. */
export function weekStart(from: Date = new Date()): string {
  const monday = new Date(from);
  monday.setDate(from.getDate() - ((from.getDay() + 6) % 7));
  return dayKey(monday);
}

export const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
export const WEEKDAY_LONG = [
  'domenica',
  'lunedì',
  'martedì',
  'mercoledì',
  'giovedì',
  'venerdì',
  'sabato',
];

export function setupSummary(s: TrainingSetup): string {
  const eq =
    s.equipment === 'gym'
      ? 'in palestra'
      : s.equipment === 'home'
        ? 'a casa con attrezzi'
        : 'a corpo libero';
  return `${s.days} allenamenti a settimana ${eq}, ${s.minutes} minuti · ${GOAL_LABELS[s.goal].toLowerCase()}`;
}

export function exerciseCard(e: Exercise, dosing?: string): ExerciseCard {
  return {
    id: e.id,
    name: e.name,
    muscles: e.muscles.map((m) => MUSCLE_LABELS[m]),
    equipment: e.equipment.map((x) => EQUIPMENT_LABELS[x]),
    level: e.level,
    steps: e.steps,
    tips: e.tips,
    mistakes: e.mistakes,
    dose: dosing,
  };
}

export function doseLabel(x: Pick<WorkoutExercise, 'sets' | 'reps'>): string {
  return x.sets > 1 ? `${x.sets} × ${x.reps}` : x.reps;
}

/** Plain text of the routine for Claude's context. */
export function workoutContext(plan: WorkoutPlan): string {
  return plan.sessions
    .map(
      (s) =>
        `${WEEKDAY_LONG[s.weekday]} — ${s.name} (${s.minutes} min): ${s.exercises
          .map((x) => `${x.name} ${doseLabel(x)}`)
          .join('; ')}`
    )
    .join('\n');
}
