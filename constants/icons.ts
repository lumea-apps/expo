import type { IconName } from '@/components/ui/Icon';
import type { Activity, Diet, Goal } from '@/lib/types';

import type { Tint } from './theme';

export interface IconSpec {
  icon: IconName;
  tint: Tint;
}

export const goalIcons: Record<Goal, IconSpec> = {
  lose: { icon: 'graph-down-new-bold-duotone', tint: 'blue' },
  energy: { icon: 'bolt-bold-duotone', tint: 'amber' },
  gain: { icon: 'dumbbell-large-minimalistic-bold-duotone', tint: 'violet' },
  maintain: { icon: 'heart-pulse-bold-duotone', tint: 'rose' },
};

export const goalHints: Record<Goal, string> = {
  lose: 'Deficit leggero, tante proteine',
  energy: 'Pasti regolari, niente cali',
  gain: 'Surplus e proteine alte',
  maintain: 'Equilibrio, senza contare tutto',
};

export const dietIcons: Record<Diet, IconSpec> = {
  omnivore: { icon: 'chef-hat-bold-duotone', tint: 'peach' },
  vegetarian: { icon: 'leaf-bold-duotone', tint: 'mint' },
  vegan: { icon: 'hand-heart-bold-duotone', tint: 'mint' },
  pescatarian: { icon: 'water-bold-duotone', tint: 'sky' },
};

export const dietHints: Record<Diet, string> = {
  omnivore: 'Mangio un po’ di tutto',
  vegetarian: 'Niente carne né pesce',
  vegan: 'Solo vegetale',
  pescatarian: 'Pesce sì, carne no',
};

export const activityIcons: Record<Activity, IconSpec> = {
  low: { icon: 'sofa-2-bold-duotone', tint: 'gray' },
  medium: { icon: 'walking-bold-duotone', tint: 'blue' },
  high: { icon: 'running-bold-duotone', tint: 'peach' },
};

export const activityHints: Record<Activity, string> = {
  low: 'Per lo più seduto',
  medium: '2–3 allenamenti a settimana',
  high: 'Sport quasi ogni giorno',
};
