import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, IconTile } from '@/components/ui/Icon';
import { PrimaryButton } from '@/components/ui/Surface';
import { Mono, Sans } from '@/components/ui/Typography';
import { PATTERN_ICON } from '@/constants/trainingIcons';
import { colors, radii, tints } from '@/constants/theme';
import { exerciseById, LEVEL_LABELS } from '@/lib/exercises';
import { haptic } from '@/lib/haptics';
import type { ExerciseCard } from '@/lib/types';
import { exerciseCard } from '@/lib/workout';

/**
 * How to do an exercise: muscles, equipment, steps, tips, mistakes, and the
 * easier / harder versions (tap to switch).
 */
export function ExerciseDetail({
  card,
  onAsk,
  maxHeight = 560,
}: {
  card: ExerciseCard;
  onAsk?: (name: string) => void;
  maxHeight?: number;
}) {
  const [shown, setShown] = useState(card);
  const e = exerciseById(shown.id);
  const icon = e ? PATTERN_ICON[e.pattern] : PATTERN_ICON.core;
  const easier = e?.easier ? exerciseById(e.easier) : undefined;
  const harder = e?.harder ? exerciseById(e.harder) : undefined;

  return (
    <ScrollView style={{ maxHeight }} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 16, paddingBottom: 4 }}>
        <View style={styles.head}>
          <IconTile name={icon.icon} tint={icon.tint} size={48} />
          <View style={{ flex: 1 }}>
            <Sans size={18} weight="semi">
              {shown.name}
            </Sans>
            <Sans size={13} color={colors.faint}>
              {[
                shown.equipment.join(' + '),
                shown.level ? LEVEL_LABELS[shown.level as 1 | 2 | 3] : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </Sans>
          </View>
        </View>

        <View style={styles.tags}>
          {shown.muscles.map((m, i) => (
            <View key={m} style={[styles.tag, i === 0 && styles.tagMain]}>
              <Sans size={12} weight="medium" color={i === 0 ? colors.onAccent : colors.dim}>
                {m}
              </Sans>
            </View>
          ))}
          {shown.dose ? (
            <View
              style={[
                styles.tag,
                { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
              ]}>
              <Mono size={12} weight="medium" color={colors.ink}>
                {shown.dose}
              </Mono>
            </View>
          ) : null}
        </View>

        <View>
          <Sans size={13} weight="medium" color={colors.faint} style={styles.label}>
            Come si fa
          </Sans>
          {shown.steps.map((s, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.num}>
                <Mono size={12} weight="medium" color={colors.ink}>
                  {i + 1}
                </Mono>
              </View>
              <Sans size={14} style={{ flex: 1, lineHeight: 21 }}>
                {s}
              </Sans>
            </View>
          ))}
        </View>

        {shown.tips.length > 0 && (
          <View style={styles.box}>
            <View style={styles.boxHead}>
              <Icon name="lightbulb-bolt-bold-duotone" size={18} color={tints.amber.fg} />
              <Sans size={13} weight="semi">
                Consigli
              </Sans>
            </View>
            {shown.tips.map((t) => (
              <Sans key={t} size={14} color={colors.dim} style={{ lineHeight: 20 }}>
                {t}
              </Sans>
            ))}
          </View>
        )}

        {shown.mistakes.length > 0 && (
          <View style={styles.box}>
            <View style={styles.boxHead}>
              <Icon name="danger-triangle-bold-duotone" size={18} color={colors.rose} />
              <Sans size={13} weight="semi">
                Errori da evitare
              </Sans>
            </View>
            {shown.mistakes.map((t) => (
              <Sans key={t} size={14} color={colors.dim} style={{ lineHeight: 20 }}>
                {t}
              </Sans>
            ))}
          </View>
        )}

        {(easier || harder) && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {easier && (
              <Variant
                label="Più facile"
                name={easier.name}
                onPress={() => setShown(exerciseCard(easier))}
              />
            )}
            {harder && (
              <Variant
                label="Più difficile"
                name={harder.name}
                onPress={() => setShown(exerciseCard(harder))}
              />
            )}
          </View>
        )}

        {onAsk && (
          <PrimaryButton
            label="Chiedi a Nouri"
            variant="outline"
            onPress={() => onAsk(shown.name)}
          />
        )}
      </View>
    </ScrollView>
  );
}

function Variant({ label, name, onPress }: { label: string; name: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => [styles.variant, pressed && { backgroundColor: colors.bgMuted }]}>
      <Sans size={12} color={colors.faint}>
        {label}
      </Sans>
      <Sans size={14} weight="medium" numberOfLines={2}>
        {name}
      </Sans>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    backgroundColor: colors.bgMuted,
  },
  tagMain: { backgroundColor: colors.ink },
  label: { marginBottom: 8 },
  step: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  num: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  box: { gap: 6, padding: 12, borderRadius: radii.md, backgroundColor: colors.bgSubtle },
  boxHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  variant: {
    flex: 1,
    gap: 2,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
