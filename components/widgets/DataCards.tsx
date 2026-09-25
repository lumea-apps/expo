import {
  AlertTriangle,
  ArrowRight,
  Droplet,
  Minus,
  Plus,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { MacroBar, Rings } from '@/components/ui/MacroRing';
import { Card } from '@/components/ui/Surface';
import { Mono, Sans, Serif } from '@/components/ui/Typography';
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Rings
          size={124}
          stroke={9}
          gap={3}
          rings={[
            { progress: totals.kcal / targets.kcal, color: colors.lime },
            { progress: totals.protein / targets.protein, color: colors.protein },
            { progress: totals.carbs / targets.carbs, color: colors.carbs },
            { progress: totals.fat / targets.fat, color: colors.fat },
          ]}
        />
        <View style={{ flex: 1 }}>
          <Mono upper size={10}>
            Rimangono
          </Mono>
          <Serif size={44} style={{ marginTop: 2 }}>
            {formatKcal(shown)}
          </Serif>
          <Mono size={11} color={colors.dim}>
            di {formatKcal(targets.kcal)} kcal · {formatKcal(totals.kcal)} mangiate
          </Mono>
        </View>
      </View>
      <View style={{ gap: 10, marginTop: 16 }}>
        {rows.map((r, i) => (
          <View key={r.label}>
            <View style={styles.rowBetween}>
              <Sans size={13} color={colors.dim}>
                {r.label}
              </Sans>
              <Mono size={12} color={colors.ink}>
                {Math.round(r.v)}
                <Mono size={12}> / {r.t} g</Mono>
              </Mono>
            </View>
            <View style={{ marginTop: 6 }}>
              <MacroBar progress={r.v / r.t} color={r.c} delay={200 + i * 100} />
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const toneMeta = {
  positive: { color: colors.lime, Icon: TrendingUp },
  neutral: { color: colors.carbs, Icon: Sparkles },
  warning: { color: colors.amber, Icon: AlertTriangle },
} as const;

export function InsightCard({
  tone,
  title,
  body,
}: {
  tone: keyof typeof toneMeta;
  title: string;
  body: string;
}) {
  const { color, Icon } = toneMeta[tone] ?? toneMeta.neutral;
  return (
    <Card style={{ padding: 16, flexDirection: 'row', gap: 14 }} tint="rgba(255,255,255,0.035)">
      <View
        style={[styles.insightIcon, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
        <Icon size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Serif size={22} italic>
          {title}
        </Serif>
        <Sans size={14} color={colors.dim} style={{ marginTop: 4 }}>
          {body}
        </Sans>
      </View>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Droplet size={16} color={colors.water} fill={colors.water} />
          <Sans size={15} weight="semi">
            Acqua
          </Sans>
        </View>
        <Mono size={12} color={colors.ink}>
          {(water / 1000).toLocaleString('it-IT', { maximumFractionDigits: 2 })}
          <Mono size={12}> / {(target / 1000).toLocaleString('it-IT')} L</Mono>
        </Mono>
      </View>
      <View style={styles.glasses}>
        {Array.from({ length: glasses }).map((_, i) => {
          const f = Math.max(0, Math.min(1, filled - i));
          return (
            <Pressable
              key={i}
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
          onPress={() => {
            haptic.soft();
            addWater(-GLASS_ML);
          }}
          style={[styles.waterBtn, styles.waterMinus]}>
          <Minus size={16} color={colors.dim} />
        </Pressable>
        <Pressable
          onPress={() => {
            haptic.soft();
            addWater(GLASS_ML);
          }}
          style={[styles.waterBtn, styles.waterPlus]}>
          <Plus size={16} color={colors.water} />
          <Sans size={14} weight="medium" color={colors.water}>
            Un bicchiere · 250 ml
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
  const H = 140;
  const logged = values.filter((v) => v > 0);
  const avg = logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : 0;
  return (
    <Card style={{ padding: 16 }}>
      <View style={styles.rowBetween}>
        <Sans size={15} weight="semi">
          Ultimi 7 giorni
        </Sans>
        <Mono size={11}>MEDIA {avg ? formatKcal(avg) : '—'} KCAL</Mono>
      </View>
      <View
        style={{ height: H, marginTop: 18, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <View pointerEvents="none" style={[styles.targetLine, { bottom: (target / max) * H }]}>
          <Mono size={9} color={colors.faint} style={styles.targetLabel}>
            {formatKcal(target)}
          </Mono>
        </View>
        {values.map((v, i) => {
          const today = i === values.length - 1;
          const h = Math.max(4, (v / max) * H * p);
          const over = v > target * 1.1;
          return (
            <View
              key={days[i]}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: H }}>
              {today && v > 0 && (
                <Mono size={10} color={colors.lime} style={{ marginBottom: 4 }}>
                  {formatKcal(v)}
                </Mono>
              )}
              <View
                style={{
                  width: '100%',
                  height: v > 0 ? h : 4,
                  borderRadius: 8,
                  backgroundColor: today
                    ? colors.lime
                    : over
                      ? 'rgba(255,138,91,0.55)'
                      : v > 0
                        ? 'rgba(184,165,255,0.5)'
                        : colors.ghost,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        {days.map((d, i) => (
          <Mono
            key={d}
            size={11}
            center
            style={{ flex: 1 }}
            color={i === days.length - 1 ? colors.lime : colors.faint}>
            {weekdayLetter(d)}
          </Mono>
        ))}
      </View>
    </Card>
  );
}

/** Plan changed in conversation: what changed, and the new daily targets vs the old ones. */
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
    { label: 'Kcal', b: before.kcal, a: after.kcal, unit: '', c: colors.lime },
    { label: 'Proteine', b: before.protein, a: after.protein, unit: 'g', c: colors.protein },
    { label: 'Carbo', b: before.carbs, a: after.carbs, unit: 'g', c: colors.carbs },
    { label: 'Grassi', b: before.fat, a: after.fat, unit: 'g', c: colors.fat },
  ];
  return (
    <Card style={{ padding: 16 }} tint="rgba(212,255,58,0.05)">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SlidersHorizontal size={16} color={colors.lime} />
        <Sans size={15} weight="semi">
          Piano aggiornato
        </Sans>
      </View>
      <View style={styles.changeRow}>
        {changes.map((c) => (
          <View key={c} style={styles.changeChip}>
            <Mono size={11} color={colors.ink}>
              {c}
            </Mono>
          </View>
        ))}
      </View>
      <View style={{ gap: 10, marginTop: 14 }}>
        {rows.map((r) => {
          const d = r.a - r.b;
          return (
            <View key={r.label} style={styles.targetRow}>
              <View style={[styles.targetDot, { backgroundColor: r.c }]} />
              <Sans size={14} color={colors.dim} style={{ flex: 1 }}>
                {r.label}
              </Sans>
              <Mono size={13} style={d !== 0 ? { textDecorationLine: 'line-through' } : undefined}>
                {formatKcal(r.b)}
                {r.unit}
              </Mono>
              <ArrowRight size={12} color={colors.faint} />
              <Mono
                size={15}
                weight="medium"
                color={colors.ink}
                style={{ minWidth: 58, textAlign: 'right' }}>
                {formatKcal(r.a)}
                {r.unit}
              </Mono>
              <Mono
                size={11}
                color={d > 0 ? colors.lime : d < 0 ? colors.amber : colors.faint}
                style={{ width: 52, textAlign: 'right' }}>
                {d === 0 ? '=' : `${d > 0 ? '+' : '−'}${formatKcal(Math.abs(d))}`}
              </Mono>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  insightIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  glasses: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  glass: {
    width: 26,
    height: 36,
    borderRadius: 8,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(108,198,255,0.35)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  glassFill: { width: '100%', backgroundColor: colors.water },
  waterBtn: {
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  waterMinus: { width: 48 },
  waterPlus: {
    flex: 1,
    backgroundColor: 'rgba(108,198,255,0.14)',
    borderColor: 'rgba(108,198,255,0.4)',
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(245,242,234,0.25)',
  },
  targetLabel: { position: 'absolute', right: 0, top: -14 },
  changeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  changeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(212,255,58,0.3)',
    backgroundColor: colors.limeSoft,
  },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  targetDot: { width: 6, height: 6, borderRadius: 3 },
});
