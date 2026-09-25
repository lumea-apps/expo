import { ArrowRight, Minus, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { MacroBar, Rings } from '@/components/ui/MacroRing';
import { Card } from '@/components/ui/Surface';
import { Mono, Sans } from '@/components/ui/Typography';
import { colors, radii } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { dayKey, dayTotals, formatKcal, lastSevenDays, weekdayLetter } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';
import type { Targets } from '@/lib/types';
import { useAnimatedNumber } from '@/lib/useAnimatedNumber';

function useToday() {
  const meals = useNouri((s) => s.meals);
  const targets = useNouri((s) => s.profile?.targets);
  return {
    totals: dayTotals(meals),
    targets: targets ?? { kcal: 2000, protein: 120, carbs: 230, fat: 65, water: 2000 },
  };
}

export function MacrosCard() {
  const { totals, targets } = useToday();
  const left = Math.max(0, targets.kcal - totals.kcal);
  const shown = useAnimatedNumber(left, 1100);
  const rows = [
    { label: 'Proteine', v: totals.protein, t: targets.protein, c: colors.protein },
    { label: 'Carboidrati', v: totals.carbs, t: targets.carbs, c: colors.carbs },
    { label: 'Grassi', v: totals.fat, t: targets.fat, c: colors.fat },
  ];
  return (
    <Card style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <Rings
          size={96}
          stroke={7}
          gap={3}
          rings={[
            { progress: totals.kcal / targets.kcal, color: colors.ink },
            { progress: totals.protein / targets.protein, color: colors.protein },
            { progress: totals.carbs / targets.carbs, color: colors.carbs },
            { progress: totals.fat / targets.fat, color: colors.fat },
          ]}
        />
        <View style={{ flex: 1 }}>
          <Sans size={13} color={colors.faint}>
            Rimangono
          </Sans>
          <Mono
            size={34}
            weight="medium"
            color={colors.ink}
            style={{ letterSpacing: -1.2, lineHeight: 40 }}>
            {formatKcal(shown)}
          </Mono>
          <Sans size={13} color={colors.faint}>
            kcal su {formatKcal(targets.kcal)} · {formatKcal(totals.kcal)} mangiate
          </Sans>
        </View>
      </View>
      <View style={{ gap: 12, marginTop: 18 }}>
        {rows.map((r, i) => (
          <View key={r.label} style={{ gap: 6 }}>
            <View style={styles.rowBetween}>
              <Sans size={13} color={colors.dim}>
                {r.label}
              </Sans>
              <Mono size={12} color={colors.ink}>
                {Math.round(r.v)}
                <Mono size={12}> / {r.t} g</Mono>
              </Mono>
            </View>
            <MacroBar progress={r.v / r.t} color={r.c} delay={200 + i * 100} />
          </View>
        ))}
      </View>
    </Card>
  );
}

const toneColor = {
  positive: colors.positive,
  neutral: colors.carbs,
  warning: colors.amber,
} as const;

/** One observation from Nouri: a coloured dot, a short title, one or two sentences. */
export function InsightCard({
  tone,
  title,
  body,
}: {
  tone: keyof typeof toneColor;
  title: string;
  body: string;
}) {
  const color = toneColor[tone] ?? toneColor.neutral;
  return (
    <Card style={{ padding: 16, backgroundColor: colors.bgSubtle, borderColor: colors.bgSubtle }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
        <Sans size={15} weight="semi">
          {title}
        </Sans>
      </View>
      <Sans size={14} color={colors.dim} style={{ marginTop: 6, lineHeight: 21 }}>
        {body}
      </Sans>
    </Card>
  );
}

const GLASS_ML = 250;

export function WaterCard() {
  const water = useNouri((s) => s.water[dayKey()] ?? 0);
  const target = useNouri((s) => s.profile?.targets.water ?? 2000);
  const addWater = useNouri((s) => s.addWater);
  const glasses = Math.max(8, Math.ceil(target / GLASS_ML));
  const filled = water / GLASS_ML;
  return (
    <Card style={{ padding: 16 }}>
      <View style={styles.rowBetween}>
        <Sans size={15} weight="semi">
          Acqua
        </Sans>
        <Mono size={13} color={colors.ink}>
          {(water / 1000).toLocaleString('it-IT', { maximumFractionDigits: 2 })}
          <Mono size={13}> / {(target / 1000).toLocaleString('it-IT')} L</Mono>
        </Mono>
      </View>
      <View style={styles.glasses}>
        {Array.from({ length: glasses }).map((_, i) => {
          const f = Math.max(0, Math.min(1, filled - i));
          return (
            <Pressable
              key={i}
              accessibilityLabel={`Bicchiere ${i + 1}`}
              onPress={() => {
                haptic.soft();
                addWater(i < filled ? -GLASS_ML : GLASS_ML);
              }}
              style={styles.glass}>
              <View style={[styles.glassFill, { height: `${f * 100}%` }]} />
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <Pressable
          accessibilityLabel="Togli un bicchiere"
          onPress={() => {
            haptic.soft();
            addWater(-GLASS_ML);
          }}
          style={({ pressed }) => [
            styles.waterBtn,
            styles.waterMinus,
            pressed && { backgroundColor: colors.bgSubtle },
          ]}>
          <Minus size={16} color={colors.dim} />
        </Pressable>
        <Pressable
          onPress={() => {
            haptic.soft();
            addWater(GLASS_ML);
          }}
          style={({ pressed }) => [
            styles.waterBtn,
            styles.waterPlus,
            pressed && { backgroundColor: colors.bgSubtle },
          ]}>
          <Plus size={16} color={colors.ink} />
          <Sans size={14} weight="medium">
            Un bicchiere, 250 ml
          </Sans>
        </Pressable>
      </View>
    </Card>
  );
}

export function WeekChart() {
  const meals = useNouri((s) => s.meals);
  const target = useNouri((s) => s.profile?.targets.kcal ?? 2000);
  const days = lastSevenDays();
  const values = days.map((d) => dayTotals(meals, d).kcal);
  const max = Math.max(target * 1.25, ...values);
  const p = useAnimatedNumber(1, 1100);
  const H = 132;
  const logged = values.filter((v) => v > 0);
  const avg = logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : 0;
  return (
    <Card style={{ padding: 16 }}>
      <View style={styles.rowBetween}>
        <Sans size={15} weight="semi">
          Ultimi 7 giorni
        </Sans>
        <Sans size={13} color={colors.faint}>
          media{' '}
          <Mono size={13} color={colors.ink}>
            {avg ? formatKcal(avg) : '—'}
          </Mono>{' '}
          kcal
        </Sans>
      </View>
      <View
        style={{ height: H, marginTop: 20, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <View pointerEvents="none" style={[styles.targetLine, { bottom: (target / max) * H }]}>
          <Mono size={10} color={colors.faint} style={styles.targetLabel}>
            obiettivo {formatKcal(target)}
          </Mono>
        </View>
        {values.map((v, i) => {
          const today = i === values.length - 1;
          const h = Math.max(4, (v / max) * H * p);
          return (
            <View
              key={days[i]}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: H }}>
              <View
                style={{
                  width: '100%',
                  height: v > 0 ? h : 4,
                  borderRadius: 6,
                  backgroundColor: today ? colors.ink : v > 0 ? '#CFCFD6' : colors.ghost,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        {days.map((d, i) => (
          <Mono
            key={d}
            size={11}
            center
            style={{ flex: 1 }}
            color={i === days.length - 1 ? colors.ink : colors.faint}>
            {weekdayLetter(d)}
          </Mono>
        ))}
      </View>
    </Card>
  );
}

/** The plan changed in conversation: what changed, then old → new daily targets. */
export function TargetsCard({
  before,
  after,
  changes,
}: {
  before: Targets;
  after: Targets;
  changes: string[];
}) {
  const rows = [
    { label: 'Calorie', b: before.kcal, a: after.kcal, unit: ' kcal', c: colors.ink },
    { label: 'Proteine', b: before.protein, a: after.protein, unit: ' g', c: colors.protein },
    { label: 'Carboidrati', b: before.carbs, a: after.carbs, unit: ' g', c: colors.carbs },
    { label: 'Grassi', b: before.fat, a: after.fat, unit: ' g', c: colors.fat },
  ];
  return (
    <Card>
      <View style={{ padding: 16, paddingBottom: 12 }}>
        <Sans size={15} weight="semi">
          Piano aggiornato
        </Sans>
        <View style={styles.changeRow}>
          {changes.map((c) => (
            <View key={c} style={styles.changeChip}>
              <Sans size={12} weight="medium">
                {c}
              </Sans>
            </View>
          ))}
        </View>
      </View>
      {rows.map((r) => {
        const d = r.a - r.b;
        return (
          <View key={r.label} style={styles.targetRow}>
            <View style={[styles.targetDot, { backgroundColor: r.c }]} />
            <Sans size={14} color={colors.dim} style={{ flex: 1 }}>
              {r.label}
            </Sans>
            {d !== 0 && (
              <>
                <Mono size={13} style={{ textDecorationLine: 'line-through' }}>
                  {formatKcal(r.b)}
                </Mono>
                <ArrowRight size={12} color={colors.faint} />
              </>
            )}
            <Mono size={14} weight="medium" color={colors.ink}>
              {formatKcal(r.a)}
              {r.unit}
            </Mono>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  glasses: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  glass: {
    width: 24,
    height: 34,
    borderRadius: 7,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CFE3F8',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  glassFill: { width: '100%', backgroundColor: colors.water },
  waterBtn: {
    height: 42,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  waterMinus: { width: 42 },
  waterPlus: { flex: 1 },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  targetLabel: { position: 'absolute', right: 0, top: -15 },
  changeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  changeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.bgMuted,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  targetDot: { width: 6, height: 6, borderRadius: 3 },
});
