import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Mono, Sans } from '@/components/ui/Typography';
import { colors, radii } from '@/constants/theme';
import { nutrientsFor } from '@/lib/foodfacts';
import type { FoodFacts, Macros } from '@/lib/types';

const g1 = (v?: number) =>
  v === undefined ? '—' : v.toLocaleString('it-IT', { maximumFractionDigits: 1 });

/** Product photo when there is one, otherwise the food's emoji on a soft tile. */
export function FoodThumb({ food, size = 40 }: { food: FoodFacts; size?: number }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: size > 40 ? radii.md : radii.sm };
  if (food.image && !failed) {
    return (
      <View style={[styles.thumb, box]}>
        <Image
          source={{ uri: food.image }}
          style={{ width: size - 6, height: size - 6 }}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      </View>
    );
  }
  if (food.emoji === '🛒') {
    return (
      <View style={[styles.thumb, box]}>
        <Icon name="box-bold-duotone" size={Math.round(size * 0.55)} color={colors.faint} />
      </View>
    );
  }
  return (
    <View style={[styles.thumb, box]}>
      <Sans size={size * 0.48} style={{ lineHeight: size * 0.6 }}>
        {food.emoji}
      </Sans>
    </View>
  );
}

/** Thin three-colour bar showing where the calories come from. */
export function MacroSplit({ m }: { m: Macros }) {
  const total = m.protein * 4 + m.carbs * 4 + m.fat * 9 || 1;
  return (
    <View style={styles.split}>
      <View style={{ flex: (m.protein * 4) / total, backgroundColor: colors.protein }} />
      <View style={{ flex: (m.carbs * 4) / total, backgroundColor: colors.carbs }} />
      <View style={{ flex: (m.fat * 9) / total, backgroundColor: colors.fat }} />
    </View>
  );
}

/** Protein / carbs / fat as three labelled numbers. */
export function MacroTrio({ m, size = 15 }: { m: Macros; size?: number }) {
  const cols = [
    { label: 'Proteine', v: m.protein, c: colors.protein },
    { label: 'Carboidrati', v: m.carbs, c: colors.carbs },
    { label: 'Grassi', v: m.fat, c: colors.fat },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {cols.map((c) => (
        <View key={c.label} style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={[styles.dot, { backgroundColor: c.c }]} />
            <Sans size={12} color={colors.faint}>
              {c.label}
            </Sans>
          </View>
          <Mono size={size} weight="medium" color={colors.ink}>
            {g1(c.v)} g
          </Mono>
        </View>
      ))}
    </View>
  );
}

/** Label-style table: per 100 g and per portion, with sugars, saturated fat, fibre and salt when known. */
export function NutritionTable({ food, grams }: { food: FoodFacts; grams: number }) {
  const p = food.per100;
  const q = nutrientsFor(food, grams);
  const rows: { label: string; a?: number; b?: number; unit: string; sub?: boolean }[] = [
    { label: 'Energia', a: p.kcal, b: q.kcal, unit: 'kcal' },
    { label: 'Proteine', a: p.protein, b: q.protein, unit: 'g' },
    { label: 'Carboidrati', a: p.carbs, b: q.carbs, unit: 'g' },
    { label: 'di cui zuccheri', a: p.sugars, b: q.sugars, unit: 'g', sub: true },
    { label: 'Grassi', a: p.fat, b: q.fat, unit: 'g' },
    { label: 'di cui saturi', a: p.satFat, b: q.satFat, unit: 'g', sub: true },
    { label: 'Fibre', a: p.fiber, b: q.fiber, unit: 'g' },
    { label: 'Sale', a: p.salt, b: q.salt, unit: 'g' },
  ].filter((r) => r.a !== undefined);
  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.head]}>
        <Sans size={12} color={colors.faint} style={{ flex: 1 }}>
          Valori medi
        </Sans>
        <Sans size={12} color={colors.faint} style={styles.col}>
          100 g
        </Sans>
        <Sans size={12} color={colors.faint} style={styles.col}>
          {grams} g
        </Sans>
      </View>
      {rows.map((r) => (
        <View key={r.label} style={styles.row}>
          <Sans
            size={13}
            color={r.sub ? colors.faint : colors.dim}
            style={{ flex: 1, paddingLeft: r.sub ? 10 : 0 }}>
            {r.label}
          </Sans>
          <Mono size={13} color={colors.dim} style={styles.col}>
            {g1(r.a)} {r.unit}
          </Mono>
          <Mono size={13} weight="medium" color={colors.ink} style={styles.col}>
            {g1(r.b)} {r.unit}
          </Mono>
        </View>
      ))}
    </View>
  );
}

export function sourceLabel(food: FoodFacts): string {
  return food.source === 'off'
    ? 'Open Food Facts'
    : food.source === 'claude'
      ? 'Stima di Nouri'
      : 'Tabella di Nouri';
}

const styles = StyleSheet.create({
  thumb: {
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  split: { flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden', gap: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  table: { borderTopWidth: 1, borderColor: colors.border },
  head: { paddingTop: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  col: { width: 84, textAlign: 'right' },
});
