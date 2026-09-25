import { LinearGradient } from 'expo-linear-gradient';
import { Check, Sparkles } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Card, PrimaryButton } from '@/components/ui/Surface';
import { Mono, Sans } from '@/components/ui/Typography';
import { colors, gradientFor, radii } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { formatKcal, formatTime, mealTotals } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';
import type { FoodItem, MealDraft } from '@/lib/types';

const PORTIONS = [1, 1.5, 2, 0.5];

function confidenceColor(c = 0.8) {
  if (c >= 0.8) return colors.fat;
  if (c >= 0.6) return colors.amber;
  return colors.rose;
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
  const [g1, g2] = gradientFor(meal.title);
  const locked = Boolean(loggedId);

  return (
    <Card style={{ padding: 16 }}>
      <View style={styles.header}>
        <LinearGradient
          colors={[g1, g2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tile}>
          <Sans size={26}>{meal.emoji}</Sans>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Mono upper size={10} color={colors.faint}>
            {meal.label} · {photo ? 'da foto' : 'stima ai'}
          </Mono>
          <Sans size={16} weight="semi" numberOfLines={2} style={{ marginTop: 2 }}>
            {meal.title}
          </Sans>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Mono size={22} weight="medium" color={colors.lime}>
            {formatKcal(tot.kcal)}
          </Mono>
          <Mono size={10}>KCAL</Mono>
        </View>
      </View>

      {/* macro split as one segmented bar */}
      <View style={styles.split}>
        <View style={{ flex: (tot.protein * 4) / macroKcal, backgroundColor: colors.protein }} />
        <View style={{ flex: (tot.carbs * 4) / macroKcal, backgroundColor: colors.carbs }} />
        <View style={{ flex: (tot.fat * 9) / macroKcal, backgroundColor: colors.fat }} />
      </View>
      <View style={styles.legend}>
        <Legend color={colors.protein} label="Proteine" value={tot.protein} />
        <Legend color={colors.carbs} label="Carbo" value={tot.carbs} />
        <Legend color={colors.fat} label="Grassi" value={tot.fat} />
      </View>

      <View style={styles.items}>
        {items.map((it, i) => (
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
              pressed && { backgroundColor: colors.cardHover },
            ]}>
            <Sans size={18}>{it.emoji}</Sans>
            <View style={{ flex: 1 }}>
              <Sans size={14} weight="medium" numberOfLines={1}>
                {it.name}
              </Sans>
              <Mono size={11}>{it.qty}</Mono>
            </View>
            {it.confidence !== undefined && (
              <View style={[styles.conf, { borderColor: confidenceColor(it.confidence) }]}>
                <View
                  style={[styles.confDot, { backgroundColor: confidenceColor(it.confidence) }]}
                />
                <Mono size={10} color={confidenceColor(it.confidence)}>
                  {Math.round(it.confidence * 100)}%
                </Mono>
              </View>
            )}
            <Mono size={13} color={colors.ink} style={{ width: 44, textAlign: 'right' }}>
              {formatKcal(it.kcal)}
            </Mono>
          </Pressable>
        ))}
      </View>

      {locked ? (
        <Animated.View entering={ZoomIn.springify()} style={styles.logged}>
          <View style={styles.check}>
            <Check size={14} color={colors.onAccent} strokeWidth={3} />
          </View>
          <Sans size={14} weight="medium" color={colors.lime}>
            Registrato{loggedMeal ? ` alle ${formatTime(loggedMeal.at)}` : ''}
          </Sans>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.delay(200)}>
          <Mono size={10} center style={{ marginBottom: 10, marginTop: 2 }}>
            TOCCA UNA VOCE PER CAMBIARE LA PORZIONE
          </Mono>
          <PrimaryButton
            label="Registra nel diario"
            icon={<Sparkles size={16} color={colors.onAccent} />}
            style={{ height: 48 }}
            onPress={() => {
              logMeal({ ...meal, items }, photo ? 'photo' : 'chat', widgetKey);
              haptic.success();
            }}
          />
        </Animated.View>
      )}
    </Card>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Mono size={11} color={colors.dim}>
        {label} {Math.round(value)}g
      </Mono>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  split: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 16,
    gap: 2,
  },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  items: {
    marginTop: 12,
    marginBottom: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginHorizontal: -6,
    borderRadius: radii.sm,
  },
  conf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  confDot: { width: 5, height: 5, borderRadius: 3 },
  logged: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.limeSoft,
    borderWidth: 1,
    borderColor: 'rgba(212,255,58,0.3)',
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
