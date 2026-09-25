import { haptic } from './haptics';
import { dayKey } from './nutrition';
import { useNouri } from './store';
import type { TrainingSetup, WorkoutPlan, WorkoutSession } from './types';
import { generateWorkoutPlan, sessionKcal, setupSummary, weekStart } from './workout';

/** Builds a routine from the Allenamento screen, makes it active and notes it in chat. */
export function createWorkoutPlan(setup: TrainingSetup): WorkoutPlan {
  const s = useNouri.getState();
  const plan = generateWorkoutPlan(setup);
  s.activateWorkoutPlan(plan);
  s.pushMessage(
    {
      role: 'assistant',
      text: `Ecco la tua scheda: ${setupSummary(plan.setup)}. Tocca un esercizio per sapere come si fa.`,
      widgets: [{ type: 'workout_plan', plan }],
      suggestions: ['Cosa mi alleno oggi?', 'Come si fa lo squat?'],
      engine: 'local',
    },
    false
  );
  return plan;
}

/** Marks a session as done today (or on `date`). */
export function logSession(plan: WorkoutPlan, session: WorkoutSession, date = dayKey()) {
  const s = useNouri.getState();
  const kcal = sessionKcal(session, s.profile?.weight ?? 70);
  const log = s.logWorkout({
    date,
    planId: plan.id,
    sessionId: session.id,
    name: session.name,
    minutes: session.minutes,
    kcal,
  });
  haptic.success();
  return log;
}

/** Sessions done since Monday of this week. */
export function doneThisWeek(): number {
  const from = weekStart();
  return useNouri.getState().workoutLog.filter((l) => l.date >= from).length;
}
