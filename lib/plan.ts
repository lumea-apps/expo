import { applyProfilePatch } from './nutrition';
import { useNouri } from './store';
import type { ProfilePatch } from './types';

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
