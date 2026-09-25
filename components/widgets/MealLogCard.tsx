import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Icon } from '@/components/ui/Icon';
import { Card, PrimaryButton } from '@/components/ui/Surface';
import { Mono, Sans } from '@/components/ui/Typography';
import { colors, radii } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { formatKcal, formatTime, mealTotals } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';
import type { FoodItem, MealDraft } from '@/lib/types';

const PORTIONS = [1, 1.5, 2, 0.5];

function confidence(c = 0.8): { label: string; color: string } {
  if (c >= 0.8) return { label: 'Alta', color: colors.positive };
  if (c >= 0.6) return { label: 'Media', color: colors.amber };
  return { label: 'Bassa', color: colors.rose };
}

function scale(item: FoodItem, k: number): FoodItem {
  if (k === 1) return item;
  return {
    ...item,
    qty: `${item.qty} ×${k}`,
    kcal: Math.round(item.kcal * k),
    protein: item.protein * k,
    carbs: item.carbs * k,
    fat: item.fat * k,
  };
}

export function MealLogCard({
  meal,
  widgetKey,
  photo,
}: {
  meal: MealDraft;
  widgetKey: string;
  photo?: boolean;
}) {
  const loggedId = useNouri((s) => s.logged[widgetKey]);
  const loggedMeal = useNouri((s) => s.meals.find((m) => m.id === loggedId));
  const logMeal = useNouri((s) => s.logMeal);
  const [mult, setMult] = useState<number[]>(() => meal.items.map(() => 1));

  const items = useMemo(
    () => meal.items.map((it, i) => scale(it, mult[i] ?? 1)),
    [meal.items, mult]
  );
  const tot = mealTotals({ items });
  const macroKcal = tot.protein * 4 + tot.carbs * 4 + tot.fat * 9 || 1;
  const locked = Boolean(loggedId);

  return (
    <Card>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Sans size={12} color={colors.faint}>
            {meal.label} · {photo ? 'stima dalla foto' : 'stima'}
          </Sans>
          <Sans size={16} weight="semi" numberOfLines={2} style={{ marginTop: 2 }}>
            {meal.title}
          </Sans>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Mono size={22} weight="medium" color={colors.ink} style={{ letterSpacing: -0.5 }}>
            {formatKcal(tot.kcal)}
          </Mono>
          <Mono size={11}>kcal</Mono>
        </View>
      </View>

      <View style={styles.macros}>
        <View style={styles.split}>
          <View style={{ flex: (tot.protein * 4) / macroKcal, backgroundColor: colors.protein }} />
          <View style={{ flex: (tot.carbs * 4) / macroKcal, backgroundColor: colors.carbs }} />
          <View style={{ flex: (tot.fat * 9) / macroKcal, backgroundColor: colors.fat }} />
        </View>
        <View style={styles.legend}>
          <Legend color={colors.protein} label="Proteine" value={tot.protein} />
          <Legend color={colors.carbs} label="Carboidrati" value={tot.carbs} />
          <Legend color={colors.fat} label="Grassi" value={tot.fat} />
        </View>
      </View>

      <View style={styles.items}>
        {items.map((it, i) => {
          const c = it.confidence !== undefined ? confidence(it.confidence) : null;
          return (
            <Pressable
              key={`${it.name}${i}`}
              disabled={locked}
              onPress={() => {
                haptic.select();
                setMult((m) =>
                  m.map((v, j) =>
                    j === i ? PORTIONS[(PORTIONS.indexOf(v) + 1) % PORTIONS.length] : v
                  )
                );
              }}
              style={({ pressed }) => [
                styles.item,
                pressed && { backgroundColor: colors.bgSubtle },
              ]}>
              <View style={styles.emoji}>
                <Sans size={16}>{it.emoji}</Sans>
              </View>
              <View style={{ flex: 1 }}>
                <Sans size={14} weight="medium" numberOfLines={1}>
                  {it.name}
                </Sans>
                <Sans size={12} color={colors.faint}>
                  {it.qty}
                  {c ? ` · affidabilità ${c.label.toLowerCase()}` : ''}
                </Sans>
              </View>
              {c && <View style={[styles.dot, { backgroundColor: c.color }]} />}
              <Mono size={13} color={colors.ink} style={{ width: 40, textAlign: 'right' }}>
                {formatKcal(it.kcal)}
              </Mono>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        {locked ? (
          <Animated.View entering={FadeIn} style={styles.logged}>
            <Icon name="check-circle-bold" size={18} color={colors.positive} />
            <Sans size={14} weight="medium" color={colors.positive}>
              Nel diario{loggedMeal ? ` alle ${formatTime(loggedMeal.at)}` : ''}
            </Sans>
          </Animated.View>
        ) : (
          <>
            <Sans size={12} color={colors.faint} center style={{ marginBottom: 10 }}>
              Tocca una voce per cambiare la porzione
            </Sans>
            <PrimaryButton
              label="Aggiungi al diario"
              style={{ height: 46 }}
              onPress={() => {
                logMeal({ ...meal, items }, photo ? 'photo' : 'chat', widgetKey);
                haptic.success();
              }}
            />
          </>
        )}
      </View>
    </Card>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Sans size={12} color={colors.dim}>
        {label}{' '}
        <Mono size={12} color={colors.ink}>
          {Math.round(value)}g
        </Mono>
      </Sans>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    paddingBottom: 0,
  },
  macros: { paddingHorizontal: 16, paddingTop: 14 },
  split: { flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  items: { marginTop: 12, borderTopWidth: 1, borderColor: colors.border, paddingVertical: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  emoji: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  footer: { padding: 16, paddingTop: 8, borderTopWidth: 1, borderColor: colors.border },
  logged: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 38,
  },
});
