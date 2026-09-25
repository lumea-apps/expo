import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { RichText } from '@/components/chat/RichText';
import { Icon, IconTile, type IconName } from '@/components/ui/Icon';
import { MacroBar } from '@/components/ui/MacroRing';
import { Card } from '@/components/ui/Surface';
import { Mono, Sans } from '@/components/ui/Typography';
import { goalIcons } from '@/constants/icons';
import { colors, radii, type Tint } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { formatKcal } from '@/lib/nutrition';
import { goalPlan, type GoalPlan } from '@/lib/onboarding';
import { useNouri } from '@/lib/store';
import { useAnimatedNumber } from '@/lib/useAnimatedNumber';

const ACTION_ICON: Record<GoalPlan['actions'][number]['icon'], { icon: IconName; tint: Tint }> = {
  chef: { icon: 'chef-hat-heart-bold-duotone', tint: 'amber' },
  calendar: { icon: 'calendar-bold-duotone', tint: 'violet' },
  dumbbell: { icon: 'dumbbells-2-bold-duotone', tint: 'mint' },
  cart: { icon: 'cart-large-2-bold-duotone', tint: 'blue' },
};

/**
 * The goal card ("scheda obiettivo"): what the user wants, how long it takes
 * at a sustainable pace, the daily numbers, three rules and what to do now.
 * It reads the live profile, so it stays right after a change made in chat.
 */
export function GoalCard({
  onAction,
  animate,
}: {
  onAction?: (text: string) => void;
  animate?: boolean;
}) {
  // decided once: the message stops being "fresh" while the animation still runs
  const [play] = useState(Boolean(animate));
  const profile = useNouri((s) => s.profile);
  const training = useNouri((s) => s.training.enabled);
  const kcal = useAnimatedNumber(profile?.targets.kcal ?? 0, play ? 1400 : 1, play ? 350 : 0);
  if (!profile) return null;

  const plan = goalPlan(profile, { trains: profile.trains || training });
  const T = profile.targets;
  const icon = goalIcons[profile.goal];
  const enter = (i: number) => (play ? FadeInDown.delay(250 + i * 140).duration(420) : undefined);
  const macros = [
    { label: 'Proteine', g: T.protein, c: colors.protein, share: (T.protein * 4) / T.kcal },
    { label: 'Carboidrati', g: T.carbs, c: colors.carbs, share: (T.carbs * 4) / T.kcal },
    { label: 'Grassi', g: T.fat, c: colors.fat, share: (T.fat * 9) / T.kcal },
  ];

  return (
    <Card>
      <View style={styles.head}>
        <IconTile name={icon.icon as IconName} tint={icon.tint} size={44} />
        <View style={{ flex: 1 }}>
          <Sans size={12} color={colors.faint}>
            La tua scheda obiettivo
          </Sans>
          <Sans size={19} weight="semi" style={{ letterSpacing: -0.3 }}>
            {plan.title}
          </Sans>
        </View>
      </View>
      <Sans size={14} color={colors.dim} style={styles.subtitle}>
        {plan.subtitle}
      </Sans>

      <Animated.View entering={enter(0)} style={styles.numbers}>
        <View style={styles.kcalRow}>
          <Mono size={40} weight="medium" color={colors.ink} style={styles.kcal}>
            {formatKcal(kcal)}
          </Mono>
          <Sans size={13} color={colors.faint} style={{ marginBottom: 7 }}>
            kcal al giorno
          </Sans>
          <View style={{ flex: 1 }} />
          <View style={styles.water}>
            <Icon name="waterdrop-bold-duotone" size={14} color={colors.water} />
            <Mono size={12} color={colors.ink}>
              {(T.water / 1000).toLocaleString('it-IT')} L
            </Mono>
          </View>
        </View>
        <View style={styles.macros}>
          {macros.map((m, i) => (
            <View key={m.label} style={{ flex: 1, gap: 6 }}>
              <Sans size={11} color={colors.faint}>
                {m.label}
              </Sans>
              <Mono size={16} weight="medium" color={colors.ink}>
                {m.g} g
              </Mono>
              <MacroBar progress={m.share * 2} color={m.c} delay={play ? 700 + i * 140 : 0} />
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={enter(1)} style={styles.section}>
        <Sans size={12} weight="medium" color={colors.faint} style={styles.label}>
          Le tue regole
        </Sans>
        {plan.rules.map((r, i) => (
          <Animated.View key={r} entering={enter(2 + i)} style={styles.rule}>
            <View style={styles.num}>
              <Mono size={12} weight="medium">
                {i + 1}
              </Mono>
            </View>
            <View style={{ flex: 1 }}>
              <RichText text={r} size={14} />
            </View>
          </Animated.View>
        ))}
      </Animated.View>

      <Animated.View entering={enter(5)} style={styles.actions}>
        <Sans
          size={12}
          weight="medium"
          color={colors.faint}
          style={[styles.label, { paddingHorizontal: 16 }]}>
          Adesso
        </Sans>
        {plan.actions.map((a, i) => (
          <Pressable
            key={a.text}
            disabled={!onAction}
            onPress={() => {
              haptic.select();
              onAction?.(a.text);
            }}
            style={({ pressed }) => [
              styles.action,
              i > 0 && styles.divider,
              pressed && { backgroundColor: colors.bgSubtle },
            ]}>
            <IconTile name={ACTION_ICON[a.icon].icon} tint={ACTION_ICON[a.icon].tint} size={32} />
            <Sans size={14} weight="medium" style={{ flex: 1 }}>
              {a.label}
            </Sans>
            <Icon name="alt-arrow-right-linear" size={16} color={colors.faint} />
          </Pressable>
        ))}
      </Animated.View>

      <View style={styles.footer}>
        <Sans size={12} color={colors.faint}>
          {plan.summary}
        </Sans>
        <RichText
          text="Si cambia parlando: *«ora peso 68 kg»*, *«voglio più proteine»*."
          size={12}
          color={colors.faint}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 0 },
  subtitle: { paddingHorizontal: 16, paddingTop: 10, lineHeight: 20 },
  numbers: {
    margin: 16,
    marginBottom: 0,
    padding: 14,
    gap: 12,
    borderRadius: radii.md,
    backgroundColor: colors.bgSubtle,
  },
  kcalRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  kcal: { letterSpacing: -1.5, lineHeight: 44 },
  water: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: colors.bg,
    marginBottom: 6,
  },
  macros: { flexDirection: 'row', gap: 14 },
  section: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  label: { marginBottom: 2 },
  rule: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  num: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  actions: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderColor: colors.border },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  divider: { borderTopWidth: 1, borderColor: colors.border },
  footer: {
    gap: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
});
