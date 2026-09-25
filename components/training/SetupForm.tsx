import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MenuGroup, MenuRow } from '@/components/ui/Menu';
import { PrimaryButton } from '@/components/ui/Surface';
import { Sans } from '@/components/ui/Typography';
import { GOAL_ICON } from '@/constants/trainingIcons';
import { colors, radii } from '@/constants/theme';
import { EQUIPMENT_SETTING, LEVEL_LABELS, type EquipmentSetting } from '@/lib/exercises';
import { haptic } from '@/lib/haptics';
import type { TrainingGoal, TrainingSetup } from '@/lib/types';
import { DEFAULT_SETUP, GOAL_HINTS, GOAL_LABELS } from '@/lib/workout';

const WHERE_ICON = {
  none: { icon: 'stretching-bold-duotone', tint: 'mint' },
  home: { icon: 'dumbbell-small-bold-duotone', tint: 'blue' },
  gym: { icon: 'dumbbells-2-bold-duotone', tint: 'violet' },
} as const;

/** Goal, where, level, days and minutes: everything the routine is built from. */
export function SetupForm({
  initial,
  cta,
  onSubmit,
}: {
  initial?: TrainingSetup | null;
  cta: string;
  onSubmit: (s: TrainingSetup) => void;
}) {
  const [s, set] = useState<TrainingSetup>(initial ?? DEFAULT_SETUP);
  const patch = (p: Partial<TrainingSetup>) => {
    haptic.select();
    set((x) => ({ ...x, ...p }));
  };
  return (
    <View style={{ gap: 18 }}>
      <MenuGroup title="Obiettivo">
        {(Object.keys(GOAL_LABELS) as TrainingGoal[]).map((g) => (
          <MenuRow
            key={g}
            icon={GOAL_ICON[g].icon}
            tint={GOAL_ICON[g].tint}
            label={GOAL_LABELS[g]}
            hint={GOAL_HINTS[g]}
            checked={s.goal === g}
            onPress={() => patch({ goal: g })}
          />
        ))}
      </MenuGroup>
      <MenuGroup title="Dove ti alleni">
        {(Object.keys(EQUIPMENT_SETTING) as EquipmentSetting[]).map((k) => (
          <MenuRow
            key={k}
            icon={WHERE_ICON[k].icon}
            tint={WHERE_ICON[k].tint}
            label={EQUIPMENT_SETTING[k].label}
            hint={EQUIPMENT_SETTING[k].hint}
            checked={s.equipment === k}
            onPress={() => patch({ equipment: k })}
          />
        ))}
      </MenuGroup>
      <Segment
        title="Livello"
        options={([1, 2, 3] as const).map((l) => ({ k: l, l: LEVEL_LABELS[l] }))}
        value={s.level}
        onChange={(level) => patch({ level })}
      />
      <Segment
        title="Allenamenti a settimana"
        options={[2, 3, 4, 5, 6].map((d) => ({ k: d, l: String(d) }))}
        value={s.days}
        onChange={(days) => patch({ days })}
      />
      <Segment
        title="Minuti per allenamento"
        options={([20, 30, 45, 60] as const).map((m) => ({ k: m, l: `${m}′` }))}
        value={s.minutes}
        onChange={(minutes) => patch({ minutes })}
      />
      <PrimaryButton label={cta} onPress={() => onSubmit(s)} />
    </View>
  );
}

function Segment<T extends number>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { k: T; l: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Sans size={13} weight="medium" color={colors.faint} style={{ marginLeft: 16 }}>
        {title}
      </Sans>
      <View style={styles.segment}>
        {options.map((o) => (
          <Pressable
            key={o.k}
            onPress={() => onChange(o.k)}
            style={[styles.item, value === o.k && styles.on]}>
            <Sans size={14} weight="medium" color={value === o.k ? colors.ink : colors.faint}>
              {o.l}
            </Sans>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.bgMuted,
  },
  item: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radii.pill },
  on: { backgroundColor: colors.bg, boxShadow: '0 1px 3px rgba(14,14,16,0.08)' },
});
