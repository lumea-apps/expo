import { shortcutUseTurn } from './ai/local';
import { haptic } from './haptics';
import { useNouri } from './store';
import type { Shortcut } from './types';

/**
 * Logs a shortcut in one tap (from the + menu, the greeting or Memoria) and
 * writes it into the conversation, so chat stays the story of the day.
 */
export function logShortcut(sc: Shortcut) {
  const s = useNouri.getState();
  const turn = shortcutUseTurn(sc);
  s.pushMessage({ role: 'user', text: sc.name });
  const msg = s.pushMessage(
    {
      role: 'assistant',
      text: turn.text,
      widgets: turn.widgets,
      suggestions: turn.suggestions,
      engine: 'local',
    },
    true
  );
  const meal = turn.widgets[0];
  if (meal?.type === 'meal_log') s.logMeal(meal.meal, 'shortcut', `${msg.id}:0`);
  s.countShortcutUse(sc.id);
  haptic.success();
}

/** A default name for a meal saved as shortcut: "Colazione solita", "Pranzo solito"… */
export function defaultShortcutName(label: string): string {
  return /a$/.test(label) ? `${label} solita` : `${label} solito`;
}
