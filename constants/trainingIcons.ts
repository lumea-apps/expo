import type { IconName } from '@/components/ui/Icon';
import type { Tint } from '@/constants/theme';

import type { Pattern } from '@/lib/exercises';
import type { TrainingGoal } from '@/lib/types';

/** An icon per movement family, used in lists of exercises. */
export const PATTERN_ICON: Record<Pattern, { icon: IconName; tint: Tint }> = {
  squat: { icon: 'body-shape-bold-duotone', tint: 'blue' },
  lunge: { icon: 'walking-bold-duotone', tint: 'blue' },
  hinge: { icon: 'dumbbells-2-bold-duotone', tint: 'violet' },
  glutes: { icon: 'body-shape-bold-duotone', tint: 'rose' },
  legs_iso: { icon: 'dumbbell-small-bold-duotone', tint: 'blue' },
  calves: { icon: 'walking-bold-duotone', tint: 'sky' },
  push_h: { icon: 'dumbbell-large-minimalistic-bold-duotone', tint: 'peach' },
  push_v: { icon: 'dumbbell-large-minimalistic-bold-duotone', tint: 'amber' },
  shoulders: { icon: 'dumbbell-small-bold-duotone', tint: 'amber' },
  pull_h: { icon: 'dumbbells-2-bold-duotone', tint: 'mint' },
  pull_v: { icon: 'dumbbells-2-bold-duotone', tint: 'mint' },
  biceps: { icon: 'dumbbell-small-bold-duotone', tint: 'violet' },
  triceps: { icon: 'dumbbell-small-bold-duotone', tint: 'violet' },
  core: { icon: 'stretching-bold-duotone', tint: 'gray' },
  cardio: { icon: 'running-bold-duotone', tint: 'rose' },
};

export const GOAL_ICON: Record<TrainingGoal, { icon: IconName; tint: Tint }> = {
  strength: { icon: 'dumbbell-large-minimalistic-bold-duotone', tint: 'violet' },
  muscle: { icon: 'body-shape-bold-duotone', tint: 'peach' },
  fat_loss: { icon: 'fire-bold-duotone', tint: 'rose' },
  fitness: { icon: 'heart-pulse-bold-duotone', tint: 'mint' },
};
