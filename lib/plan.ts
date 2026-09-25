import { dayName, generatePlan, redatePlan } from './mealplan';
import { applyProfilePatch } from './nutrition';
import { useNouri } from './store';
import type { MealPlan, PlanFocus, ProfilePatch } from './types';

/**
 * Changes the plan from a settings menu and tells the conversation about it,
 * so chat stays the single story of what happened.
 */
export function updatePlan(patch: ProfilePatch): string[] {
  const s = useNouri.getState();
  if (!s.profile) return [];
  const before = s.profile;
  const { profile, changes } = applyProfilePatch(before, patch);
  if (!changes.length) return [];
  s.setProfile(profile);
  s.pushMessage(
    {
      role: 'assistant',
      text: 'Ho aggiornato il tuo piano dalle impostazioni.',
      widgets: [{ type: 'targets', before: before.targets, after: profile.targets, changes }],
      suggestions: ['Idee con il nuovo piano', 'Com’è andata oggi?'],
      engine: 'local',
    },
    false
  );
  return changes;
}

/** Creates a meal plan from the Piano pasti screen, makes it active and notes it in chat. */
export function createMealPlan(opts: {
  kind: 'day' | 'week';
  focus: PlanFocus;
  tomorrow?: boolean;
}): MealPlan | null {
  const s = useNouri.getState();
  if (!s.profile) return null;
  const start = new Date();
  if (opts.tomorrow) start.setDate(start.getDate() + 1);
  const plan = generatePlan({
    profile: s.profile,
    memories: s.memoryOn ? s.memories : [],
    kind: opts.kind,
    focus: opts.focus,
    start,
  });
  s.setPlan(plan);
  s.pushMessage(
    {
      role: 'assistant',
      text: `Ho preparato il piano ${plan.kind === 'week' ? 'della settimana' : `di ${dayName(plan.days[0].date).toLowerCase()}`}. Tocca un piatto per la ricetta.`,
      widgets: [{ type: 'meal_plan', plan }],
      suggestions: ['Lista della spesa del piano', 'Piano di oggi'],
      engine: 'local',
    },
    false
  );
  return plan;
}

/** Puts a saved plan back in use, from today, with the same dishes. */
export function reuseMealPlan(past: MealPlan): MealPlan {
  const s = useNouri.getState();
  const plan = redatePlan(past);
  s.setPlan(plan);
  s.pushMessage(
    {
      role: 'assistant',
      text: `Ho rimesso in piano gli stessi piatti, da oggi. Il piano che avevi prima resta tra i piani salvati.`,
      widgets: [{ type: 'meal_plan', plan }],
      suggestions: ['Lista della spesa del piano', 'Piano di oggi'],
      engine: 'local',
    },
    false
  );
  return plan;
}
