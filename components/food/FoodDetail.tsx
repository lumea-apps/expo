import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Chip, PrimaryButton } from '@/components/ui/Surface';
import { Mono, Sans } from '@/components/ui/Typography';
import { colors, radii } from '@/constants/theme';
import { nutrientsFor, toFoodItem } from '@/lib/foodfacts';
import { haptic } from '@/lib/haptics';
import { formatKcal, labelForTime } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';
import type { FoodFacts, MealLabel } from '@/lib/types';

import { FoodThumb, MacroSplit, MacroTrio, NutritionTable, sourceLabel } from './NutritionFacts';

const MOMENTS: MealLabel[] = ['Colazione', 'Pranzo', 'Spuntino', 'Cena'];

/**
 * Nutrition facts for one food with a portion picker and a one-tap
 * "add to diary": the heart of the quick search.
 */
export function FoodDetail({
  food,
  onAdded,
  onAsk,
}: {
  food: FoodFacts;
  onAdded: (summary: string) => void;
  onAsk?: () => void;
}) {
  const [grams, setGrams] = useState(food.portion.grams);
  const [label, setLabel] = useState<MealLabel>(labelForTime());
  const [table, setTable] = useState(false);
  const n = nutrientsFor(food, grams);

  // the product's own portion first, then round amounts
  const presets: [number, string][] = [];
  const preset = (g: number, l: string) => {
    if (!presets.some(([x]) => x === g)) presets.push([g, l]);
  };
  if (food.portion.grams !== 100) preset(food.portion.grams, food.portion.label);
  [50, 100, 150, 200].forEach((g) => preset(g, `${g} g`));

  const step = (d: number) => {
    haptic.select();
    setGrams((g) => Math.min(2000, Math.max(5, g + d)));
  };

  const add = () => {
    const s = useNouri.getState();
    const item = toFoodItem(food, grams);
    s.logMeal({ title: food.name, emoji: food.emoji, label, items: [item] }, 'search');
    s.pushRecentFood(food);
    haptic.success();
    onAdded(`${food.name} · ${formatKcal(n.kcal)} kcal`);
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.head}>
        <FoodThumb food={food} size={52} />
        <View style={{ flex: 1 }}>
          <Sans size={17} weight="semi" numberOfLines={2}>
            {food.name}
          </Sans>
          <Sans size={13} color={colors.faint} numberOfLines={1}>
            {[food.brand, sourceLabel(food)].filter(Boolean).join(' · ')}
          </Sans>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 8 }}>
        {presets.map(([g, l]) => (
          <Chip key={g} label={l} active={grams === g} onPress={() => setGrams(g)} />
        ))}
      </ScrollView>

      <View style={styles.amount}>
        <Pressable
          accessibilityLabel="Meno 10 grammi"
          onPress={() => step(-10)}
          style={styles.step}>
          <Icon name="minus-linear" size={20} />
        </Pressable>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Mono
            size={34}
            weight="medium"
            color={colors.ink}
            style={{ letterSpacing: -1.2, lineHeight: 40 }}>
            {formatKcal(n.kcal)}
          </Mono>
          <Sans size={13} color={colors.faint}>
            kcal in {grams} g
          </Sans>
        </View>
        <Pressable accessibilityLabel="Più 10 grammi" onPress={() => step(10)} style={styles.step}>
          <Icon name="add-linear" size={20} />
        </Pressable>
      </View>

      <View style={{ gap: 10 }}>
        <MacroSplit m={n} />
        <MacroTrio m={n} />
      </View>

      <Pressable
        onPress={() => {
          haptic.select();
          setTable((v) => !v);
        }}
        style={styles.toggle}>
        <Sans size={14} weight="medium">
          Tabella nutrizionale
        </Sans>
        <Icon
          name="alt-arrow-down-linear"
          size={18}
          color={colors.dim}
          style={{ transform: [{ rotate: table ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {table && <NutritionTable food={food} grams={grams} />}

      <View style={styles.moments}>
        {MOMENTS.map((m) => (
          <Pressable
            key={m}
            onPress={() => {
              haptic.select();
              setLabel(m);
            }}
            style={[styles.moment, label === m && styles.momentOn]}>
            <Sans size={13} weight="medium" color={label === m ? colors.ink : colors.faint}>
              {m}
            </Sans>
          </Pressable>
        ))}
      </View>

      <View style={{ gap: 8 }}>
        <PrimaryButton label={`Aggiungi a ${label.toLowerCase()}`} onPress={add} />
        {onAsk && <PrimaryButton label="Chiedi a Nouri" variant="outline" onPress={onAsk} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  amount: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  moments: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.bgMuted,
  },
  moment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radii.pill },
  momentOn: { backgroundColor: colors.bg, boxShadow: '0 1px 3px rgba(14,14,16,0.08)' },
});
