import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, IconTile } from '@/components/ui/Icon';
import { MacroBar } from '@/components/ui/MacroRing';
import { Card, PrimaryButton } from '@/components/ui/Surface';
import { Mono, Sans } from '@/components/ui/Typography';
import { colors, radii } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { dayChip, planDayTotals, planMealKey, planTitle, servingsLabel } from '@/lib/mealplan';
import { dayKey, formatKcal } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';
import type { MealPlan } from '@/lib/types';

/** A daily or weekly meal plan in chat: pick a day, tap a dish for its recipe. */
export function MealPlanCard({ plan, onSend }: { plan: MealPlan; onSend: (text: string) => void }) {
  const router = useRouter();
  const active = useNouri((s) => s.plan);
  const planLog = useNouri((s) => s.planLog);
  const target = useNouri((s) => s.profile?.targets.kcal ?? 2000);
  const setPlan = useNouri((s) => s.setPlan);
  const today = dayKey();
  const [sel, setSel] = useState(() =>
    Math.max(
      0,
      plan.days.findIndex((d) => d.date === today)
    )
  );
  const day = plan.days[sel] ?? plan.days[0];
  const tot = useMemo(() => planDayTotals(day), [day]);
  const isActive = active?.id === plan.id;

  return (
    <Card>
      <View style={styles.head}>
        <IconTile name="calendar-bold-duotone" tint="violet" size={34} />
        <View style={{ flex: 1 }}>
          <Sans size={12} color={colors.faint}>
            Piano pasti{isActive ? ' · attivo' : ''}
          </Sans>
          <Sans size={16} weight="semi" numberOfLines={1}>
            {plan.days.length > 1 ? planTitle(plan) : planTitle({ ...plan, kind: 'day' })}
          </Sans>
        </View>
      </View>

      {plan.days.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}
          style={{ marginTop: 14 }}>
          {plan.days.map((d, i) => {
            const c = dayChip(d.date);
            const on = i === sel;
            return (
              <Pressable
                key={d.date}
                onPress={() => {
                  haptic.select();
                  setSel(i);
                }}
                style={[styles.day, on && styles.dayOn]}>
                <Sans size={11} color={on ? colors.onAccent : colors.faint}>
                  {d.date === today ? 'Oggi' : c.weekday}
                </Sans>
                <Mono size={15} weight="medium" color={on ? colors.onAccent : colors.ink}>
                  {c.day}
                </Mono>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.meals}>
        {day.meals.map((m, i) => {
          const done = Boolean(planLog[planMealKey(plan.id, day.date, i)]);
          return (
            <Pressable
              key={`${day.date}${i}`}
              onPress={() => {
                haptic.select();
                onSend(`Ricetta: ${m.title}`);
              }}
              style={({ pressed }) => [
                styles.meal,
                i > 0 && styles.divider,
                pressed && { backgroundColor: colors.bgSubtle },
              ]}>
              <View style={styles.emoji}>
                <Sans size={17}>{m.emoji}</Sans>
              </View>
              <View style={{ flex: 1 }}>
                <Sans size={12} color={colors.faint}>
                  {m.label} · {m.minutes}′
                  {m.servings !== 1 ? ` · ${servingsLabel(m.servings)}` : ''}
                </Sans>
                <Sans
                  size={14}
                  weight="medium"
                  numberOfLines={2}
                  color={done ? colors.faint : colors.ink}>
                  {m.title}
                </Sans>
              </View>
              {done ? (
                <Icon name="check-circle-bold" size={18} color={colors.positive} />
              ) : (
                <Mono size={13} color={colors.ink}>
                  {formatKcal(m.kcal)}
                </Mono>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.total}>
        <View style={styles.totalRow}>
          <Sans size={13} color={colors.dim}>
            Totale giornata
          </Sans>
          <Sans size={13} color={colors.dim}>
            <Mono size={13} weight="medium" color={colors.ink}>
              {formatKcal(tot.kcal)}
            </Mono>{' '}
            / {formatKcal(target)} kcal ·{' '}
            <Mono size={13} weight="medium" color={colors.protein}>
              {Math.round(tot.protein)} g
            </Mono>{' '}
            proteine
          </Sans>
        </View>
        <MacroBar progress={tot.kcal / target} color={colors.ink} delay={150} />
      </View>

      <View style={styles.footer}>
        {isActive ? (
          <>
            <PrimaryButton
              label="Apri il piano"
              variant="outline"
              style={{ flex: 1, height: 44 }}
              onPress={() => router.push('/meal-plan')}
            />
            <PrimaryButton
              label="Spesa"
              variant="outline"
              style={{ height: 44 }}
              icon={<Icon name="cart-large-2-bold-duotone" size={18} color={colors.ink} />}
              onPress={() => onSend('Lista della spesa del piano')}
            />
          </>
        ) : (
          <PrimaryButton
            label="Usa questo piano"
            variant="outline"
            style={{ flex: 1, height: 44 }}
            onPress={() => {
              setPlan(plan);
              haptic.success();
            }}
          />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 0 },
  day: {
    width: 46,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.bgSubtle,
  },
  dayOn: { backgroundColor: colors.ink },
  meals: { marginTop: 12, borderTopWidth: 1, borderColor: colors.border },
  meal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  divider: { borderTopWidth: 1, borderColor: colors.border },
  emoji: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  total: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  footer: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
});
