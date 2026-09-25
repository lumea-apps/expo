import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseDetail } from '@/components/training/ExerciseDetail';
import { Icon, IconTile } from '@/components/ui/Icon';
import { SheetProvider, useSheet } from '@/components/ui/Sheet';
import { Chip } from '@/components/ui/Surface';
import { Sans } from '@/components/ui/Typography';
import { PATTERN_ICON } from '@/constants/trainingIcons';
import { colors, fonts, radii } from '@/constants/theme';
import {
  EQUIPMENT_LABELS,
  EQUIPMENT_SETTING,
  LEVEL_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  searchExercises,
  type EquipmentSetting,
  type Exercise,
} from '@/lib/exercises';
import { haptic } from '@/lib/haptics';
import { useNouri } from '@/lib/store';
import { useSend } from '@/lib/useSend';
import { exerciseCard } from '@/lib/workout';

export default function Exercises() {
  return (
    <SheetProvider>
      <ExercisesContent />
    </SheetProvider>
  );
}

const WHERE: { k: EquipmentSetting | 'all'; l: string }[] = [
  { k: 'all', l: 'Tutti' },
  { k: 'none', l: 'Corpo libero' },
  { k: 'home', l: 'Casa' },
  { k: 'gym', l: 'Palestra' },
];

/** "Cerca esercizio": by name or muscle, filtered by where you train; each one explained. */
function ExercisesContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheet = useSheet();
  const send = useSend();
  const setup = useNouri((s) => s.training.setup);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [where, setWhere] = useState<EquipmentSetting | 'all'>(setup?.equipment ?? 'all');

  const results = useMemo(
    () =>
      searchExercises(q, {
        muscles: MUSCLE_GROUPS.find((g) => g.label === group)?.muscles,
        setting: where === 'all' ? undefined : where,
      }),
    [q, group, where]
  );

  const open = (e: Exercise) => {
    Keyboard.dismiss();
    sheet.open({
      render: (close) => (
        <ExerciseDetail
          card={exerciseCard(e)}
          onAsk={(name) =>
            close(() => {
              router.back();
              setTimeout(() => send({ text: `Spiegami: ${name}` }), 350);
            })
          }
        />
      ),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <View style={styles.field}>
          <Icon name="magnifer-linear" size={18} color={colors.faint} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Esercizio o muscolo"
            placeholderTextColor={colors.faint}
            autoCorrect={false}
            returnKeyType="search"
            selectionColor={colors.ink}
            style={styles.input}
          />
          {q ? (
            <Pressable accessibilityLabel="Cancella" hitSlop={8} onPress={() => setQ('')}>
              <Icon name="close-circle-bold" size={18} color={colors.faint} />
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Sans size={15} weight="medium" color={colors.dim}>
            Chiudi
          </Sans>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 16 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 8 }}>
          {MUSCLE_GROUPS.map((g) => (
            <Chip
              key={g.label}
              label={g.label}
              active={group === g.label}
              onPress={() => setGroup((cur) => (cur === g.label ? null : g.label))}
            />
          ))}
        </ScrollView>

        <View style={styles.segment}>
          {WHERE.map((w) => (
            <Pressable
              key={w.k}
              onPress={() => {
                haptic.select();
                setWhere(w.k);
              }}
              style={[styles.segItem, where === w.k && styles.segOn]}>
              <Sans size={13} weight="medium" color={where === w.k ? colors.ink : colors.faint}>
                {w.l}
              </Sans>
            </Pressable>
          ))}
        </View>
        {where !== 'all' && (
          <Sans size={12} color={colors.faint} style={{ marginTop: -8, marginLeft: 4 }}>
            {EQUIPMENT_SETTING[where].hint}
          </Sans>
        )}

        <View style={styles.list}>
          {results.length === 0 ? (
            <Sans size={14} color={colors.faint} style={{ padding: 16 }}>
              Nessun esercizio con questi filtri.
            </Sans>
          ) : (
            results.map((e, i) => {
              const ic = PATTERN_ICON[e.pattern];
              return (
                <Pressable
                  key={e.id}
                  onPress={() => {
                    haptic.select();
                    open(e);
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    i > 0 && styles.divider,
                    pressed && { backgroundColor: colors.bgSubtle },
                  ]}>
                  <IconTile name={ic.icon} tint={ic.tint} size={38} />
                  <View style={{ flex: 1 }}>
                    <Sans size={15} weight="medium" numberOfLines={1}>
                      {e.name}
                    </Sans>
                    <Sans size={12} color={colors.faint} numberOfLines={1}>
                      {e.muscles
                        .slice(0, 2)
                        .map((m) => MUSCLE_LABELS[m])
                        .join(', ')}{' '}
                      · {e.equipment.map((x) => EQUIPMENT_LABELS[x]).join(' + ')} ·{' '}
                      {LEVEL_LABELS[e.level]}
                    </Sans>
                  </View>
                  <Icon name="alt-arrow-right-linear" size={16} color={colors.faint} />
                </Pressable>
              );
            })
          )}
        </View>
        <Sans size={12} color={colors.faint} center>
          {results.length} esercizi · tocca per la spiegazione
        </Sans>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: colors.bgMuted,
  },
  input: {
    flex: 1,
    height: 42,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.bgMuted,
  },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radii.pill },
  segOn: { backgroundColor: colors.bg, boxShadow: '0 1px 3px rgba(14,14,16,0.08)' },
  list: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  divider: { borderTopWidth: 1, borderColor: colors.border },
});
