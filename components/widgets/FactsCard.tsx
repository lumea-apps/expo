import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  FoodThumb,
  MacroSplit,
  MacroTrio,
  NutritionTable,
  sourceLabel,
} from '@/components/food/NutritionFacts';
import { Icon } from '@/components/ui/Icon';
import { Card, PrimaryButton } from '@/components/ui/Surface';
import { Mono, Sans } from '@/components/ui/Typography';
import { colors } from '@/constants/theme';
import { nutrientsFor, toFoodItem } from '@/lib/foodfacts';
import { haptic } from '@/lib/haptics';
import { formatKcal, formatTime, labelForTime } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';
import type { FoodFacts } from '@/lib/types';

/** Nutrition facts for one food in chat, with its portion and a one-tap add. */
export function FoodFactsCard({ food, widgetKey }: { food: FoodFacts; widgetKey: string }) {
  const [table, setTable] = useState(false);
  const loggedId = useNouri((s) => s.logged[widgetKey]);
  const loggedMeal = useNouri((s) => s.meals.find((m) => m.id === loggedId));
  const n = nutrientsFor(food, food.portion.grams);

  return (
    <Card>
      <View style={{ padding: 16, gap: 14 }}>
        <View style={styles.head}>
          <FoodThumb food={food} size={44} />
          <View style={{ flex: 1 }}>
            <Sans size={16} weight="semi" numberOfLines={2}>
              {food.name}
            </Sans>
            <Sans size={12} color={colors.faint} numberOfLines={1}>
              {[food.brand, sourceLabel(food)].filter(Boolean).join(' · ')}
            </Sans>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Mono size={22} weight="medium" color={colors.ink} style={{ letterSpacing: -0.5 }}>
              {formatKcal(n.kcal)}
            </Mono>
            <Mono size={11}>kcal · {food.portion.label}</Mono>
          </View>
        </View>
        <MacroSplit m={n} />
        <MacroTrio m={n} size={14} />
      </View>

      <Pressable
        onPress={() => {
          haptic.select();
          setTable((v) => !v);
        }}
        style={({ pressed }) => [styles.toggle, pressed && { backgroundColor: colors.bgSubtle }]}>
        <Sans size={14} weight="medium">
          Per 100 g e tabella completa
        </Sans>
        <Icon
          name="alt-arrow-down-linear"
          size={18}
          color={colors.dim}
          style={{ transform: [{ rotate: table ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {table && (
        <Animated.View entering={FadeIn} style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <NutritionTable food={food} grams={food.portion.grams} />
        </Animated.View>
      )}

      <View style={styles.footer}>
        {loggedId ? (
          <View style={styles.done}>
            <Icon name="check-circle-bold" size={18} color={colors.positive} />
            <Sans size={14} weight="medium" color={colors.positive}>
              Nel diario{loggedMeal ? ` alle ${formatTime(loggedMeal.at)}` : ''}
            </Sans>
          </View>
        ) : (
          <PrimaryButton
            label={`Aggiungi ${food.portion.label}`}
            variant="outline"
            style={{ height: 44 }}
            onPress={() => {
              const s = useNouri.getState();
              s.logMeal(
                {
                  title: food.name,
                  emoji: food.emoji,
                  label: labelForTime(),
                  items: [toFoodItem(food, food.portion.grams)],
                },
                'search',
                widgetKey
              );
              s.pushRecentFood(food);
              haptic.success();
            }}
          />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  footer: { padding: 16, paddingTop: 12, borderTopWidth: 1, borderColor: colors.border },
  done: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
