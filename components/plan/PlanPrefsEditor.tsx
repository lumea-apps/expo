import { View } from 'react-native';

import type { IconName } from '@/components/ui/Icon';
import { MenuGroup, MenuRow } from '@/components/ui/Menu';
import type { Tint } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { focusHints, focusLabels } from '@/lib/mealplan';
import { useNouri } from '@/lib/store';
import type { PlanFocus } from '@/lib/types';

export const FOCUS_ICONS: Record<PlanFocus, { icon: IconName; tint: Tint }> = {
  balanced: { icon: 'target-bold-duotone', tint: 'blue' },
  protein: { icon: 'dumbbell-large-minimalistic-bold-duotone', tint: 'violet' },
  quick: { icon: 'stopwatch-bold-duotone', tint: 'amber' },
  light: { icon: 'leaf-bold-duotone', tint: 'mint' },
};

export const kindLabel = (k: 'day' | 'week') => (k === 'week' ? 'Settimana' : 'Un giorno');

/** Default duration and style used when a plan is asked for without saying. */
export function PlanPrefsEditor() {
  const prefs = useNouri((s) => s.planPrefs);
  const set = useNouri((s) => s.setPlanPrefs);
  return (
    <View style={{ gap: 18 }}>
      <MenuGroup title="Durata predefinita">
        {(['week', 'day'] as const).map((k) => (
          <MenuRow
            key={k}
            icon={k === 'week' ? 'calendar-bold-duotone' : 'calendar-add-bold-duotone'}
            tint={k === 'week' ? 'violet' : 'blue'}
            label={kindLabel(k)}
            hint={
              k === 'week'
                ? 'Sette giorni, colazione, pranzo, spuntino e cena'
                : 'Solo oggi o domani'
            }
            checked={prefs.kind === k}
            onPress={() => {
              haptic.select();
              set({ kind: k });
            }}
          />
        ))}
      </MenuGroup>
      <MenuGroup title="Stile predefinito">
        {(Object.keys(focusLabels) as PlanFocus[]).map((f) => (
          <MenuRow
            key={f}
            icon={FOCUS_ICONS[f].icon}
            tint={FOCUS_ICONS[f].tint}
            label={focusLabels[f]}
            hint={focusHints[f]}
            checked={prefs.focus === f}
            onPress={() => {
              haptic.select();
              set({ focus: f });
            }}
          />
        ))}
      </MenuGroup>
    </View>
  );
}
