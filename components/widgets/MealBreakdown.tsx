import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Mono, Sans } from '@/components/ui/Typography';
import { colors } from '@/constants/theme';
import { formatKcal } from '@/lib/nutrition';
import type { FoodItem, Macros } from '@/lib/types';
import { useAnimatedNumber } from '@/lib/useAnimatedNumber';

const H = 284;
const PLATE = 86;
const CY = 104;
/** Top of the protein / carbs / fat totals. */
const COLUMNS = H - 88;
const MAX_ITEMS = 7;
const MACROS = [
  { key: 'protein', label: 'Proteine', color: colors.protein, kcal: 4 },
  { key: 'carbs', label: 'Carboidrati', color: colors.carbs, kcal: 4 },
  { key: 'fat', label: 'Grassi', color: colors.fat, kcal: 9 },
] as const;

// timeline (ms)
const T_PLATE = 0;
const T_BURST = 520;
const T_FLOW = 1250;
const FLOW = 760;
const T_COUNT = T_FLOW + 380;

/**
 * The dish taken apart: the plate (the photo, or the dish emoji when the meal
 * was described in words), its ingredients bursting out around it, and each
 * ingredient's protein, carbs and fat flowing into the three totals below.
 * Plays once for a fresh reply; older messages show the final state.
 */
export function MealBreakdown({
  items,
  emoji,
  photoUri,
  totals,
  animate,
}: {
  items: FoodItem[];
  emoji: string;
  photoUri?: string;
  totals: Macros;
  animate: boolean;
}) {
  // decided once: the message stops being "fresh" while the animation still runs
  const [play] = useState(animate);
  const [w, setW] = useState(0);
  const shown = items.slice(0, MAX_ITEMS);
  const cx = w / 2;
  const rx = Math.min(cx - 34, 132);
  const ry = 76;
  // an arc over the plate, from left to right: the space below stays free for the flow
  const spots = shown.map((_, i) => {
    const a = ((-200 + ((i + 0.5) * 220) / shown.length) * Math.PI) / 180;
    return { x: cx + rx * Math.cos(a), y: CY + ry * Math.sin(a) };
  });
  const targets = MACROS.map((_, k) => ({ x: (w * (1 + 2 * k)) / 6, y: COLUMNS + 4 }));
  const macroKcal = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9 || 1;

  return (
    <View style={{ height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <>
          <Plate emoji={emoji} photoUri={photoUri} cx={cx} animate={play} />
          {shown.map((it, i) =>
            MACROS.map((m, k) => {
              const grams = it[m.key];
              if (grams < 0.5) return null;
              return (
                <Particle
                  key={`${i}${m.key}`}
                  from={spots[i]}
                  to={targets[k]}
                  color={m.color}
                  size={Math.max(5, Math.min(13, 4 + Math.sqrt(grams) * 1.4))}
                  delay={T_FLOW + i * 90 + k * 55}
                  animate={play}
                />
              );
            })
          )}
          {shown.map((it, i) => (
            <Bubble
              key={`${it.name}${i}`}
              item={it}
              cx={cx}
              to={spots[i]}
              delay={T_BURST + i * 95}
              small={shown.length > 5}
              animate={play}
            />
          ))}
          <View style={[styles.columns, { top: COLUMNS }]}>
            {MACROS.map((m) => (
              <Column
                key={m.key}
                label={m.label}
                color={m.color}
                grams={totals[m.key]}
                share={(totals[m.key] * m.kcal) / macroKcal}
                animate={play}
              />
            ))}
          </View>
          <SplitBar totals={totals} animate={play} />
        </>
      )}
    </View>
  );
}

function Plate({
  emoji,
  photoUri,
  cx,
  animate,
}: {
  emoji: string;
  photoUri?: string;
  cx: number;
  animate: boolean;
}) {
  const s = useSharedValue(animate ? 0 : 1);
  const ring = useSharedValue(0);
  const scan = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    s.value = withDelay(T_PLATE, withSpring(1, { damping: 13, stiffness: 160 }));
    // a ripple as the dish "opens up"; a scan line over a photo
    ring.value = withDelay(
      T_BURST - 120,
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 0 })
      )
    );
    scan.value = withDelay(
      150,
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })
    );
  }, [animate, s, ring, scan]);

  const plate = useAnimatedStyle(() => ({
    opacity: s.value,
    transform: [{ scale: 0.6 + 0.4 * s.value }],
  }));
  const ripple = useAnimatedStyle(() => ({
    opacity: ring.value > 0 ? 0.5 * (1 - ring.value) : 0,
    transform: [{ scale: 1 + ring.value * 0.9 }],
  }));
  const line = useAnimatedStyle(() => ({
    opacity: scan.value > 0 && scan.value < 1 ? 1 : 0,
    transform: [{ translateY: -PLATE / 2 + scan.value * PLATE }],
  }));

  const box = { left: cx - PLATE / 2, top: CY - PLATE / 2, width: PLATE, height: PLATE };
  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.ripple, box, ripple]} />
      <Animated.View style={[styles.plate, box, plate]}>
        {photoUri ? (
          <>
            <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <Animated.View pointerEvents="none" style={[styles.scan, line]} />
          </>
        ) : (
          <Sans size={40} style={{ lineHeight: 48 }}>
            {emoji}
          </Sans>
        )}
      </Animated.View>
    </>
  );
}

function Bubble({
  item,
  cx,
  to,
  delay,
  small,
  animate,
}: {
  item: FoodItem;
  cx: number;
  to: { x: number; y: number };
  delay: number;
  small?: boolean;
  animate: boolean;
}) {
  const p = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate) p.value = withDelay(delay, withSpring(1, { damping: 15, stiffness: 130 }));
  }, [animate, delay, p]);
  const dx = to.x - cx;
  const dy = to.y - CY;
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 1.6),
    transform: [
      { translateX: dx * p.value },
      { translateY: dy * p.value },
      { scale: 0.35 + 0.65 * Math.min(1.1, p.value) },
    ],
  }));
  return (
    <Animated.View
      style={[styles.bubbleWrap, { left: cx - 30, top: CY - (small ? 19 : 22) }, style]}>
      <View style={[styles.bubble, small && styles.bubbleSmall]}>
        <Sans size={19} style={{ lineHeight: 24 }}>
          {item.emoji}
        </Sans>
      </View>
      <Mono size={10} color={colors.dim} numberOfLines={1}>
        {formatKcal(item.kcal)}
      </Mono>
    </Animated.View>
  );
}

function Particle({
  from,
  to,
  color,
  size,
  delay,
  animate,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  size: number;
  delay: number;
  animate: boolean;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (animate)
      t.value = withDelay(
        delay,
        withTiming(1, { duration: FLOW, easing: Easing.inOut(Easing.cubic) })
      );
  }, [animate, delay, t]);
  // a gentle arc: control point above the midpoint
  const c = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 24 };
  const style = useAnimatedStyle(() => {
    const v = t.value;
    const u = 1 - v;
    const x = u * u * from.x + 2 * u * v * c.x + v * v * to.x;
    const y = u * u * from.y + 2 * u * v * c.y + v * v * to.y;
    const fade = v <= 0 || v >= 1 ? 0 : v < 0.12 ? v / 0.12 : v > 0.82 ? (1 - v) / 0.18 : 1;
    return {
      opacity: fade,
      transform: [
        { translateX: x - size / 2 },
        { translateY: y - size / 2 },
        { scale: 1 - 0.45 * v },
      ],
    };
  });
  if (!animate) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

function Column({
  label,
  color,
  grams,
  share,
  animate,
}: {
  label: string;
  color: string;
  grams: number;
  share: number;
  animate: boolean;
}) {
  const g = useAnimatedNumber(grams, animate ? 1000 : 1, animate ? T_COUNT : 0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!animate) return;
    pulse.value = withDelay(
      T_FLOW + 520,
      withRepeat(
        withSequence(withTiming(1.5, { duration: 160 }), withTiming(1, { duration: 220 })),
        2
      )
    );
  }, [animate, pulse]);
  const dot = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <View style={styles.column}>
      <Animated.View style={[styles.dot, { backgroundColor: color }, dot]} />
      <Sans size={11} color={colors.faint}>
        {label}
      </Sans>
      <Mono size={17} weight="medium" color={colors.ink}>
        {Math.round(g)} g
      </Mono>
      <Mono size={10} color={colors.faint}>
        {Math.round(share * 100)}% kcal
      </Mono>
    </View>
  );
}

function SplitBar({ totals, animate }: { totals: Macros; animate: boolean }) {
  const p = useAnimatedNumber(1, animate ? 900 : 1, animate ? T_COUNT + 200 : 0);
  const k = [totals.protein * 4, totals.carbs * 4, totals.fat * 9];
  return (
    <View style={styles.split}>
      <View style={{ flexDirection: 'row', gap: 2, width: `${p * 100}%`, height: 4 }}>
        {MACROS.map((m, i) => (
          <View
            key={m.key}
            style={{ flex: k[i] || 0.001, backgroundColor: m.color, borderRadius: 2 }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    position: 'absolute',
    borderRadius: PLATE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ripple: {
    position: 'absolute',
    borderRadius: PLATE / 2,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  scan: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PLATE / 2,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  bubbleWrap: { position: 'absolute', width: 60, alignItems: 'center', gap: 2 },
  bubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleSmall: { width: 38, height: 38, borderRadius: 19 },
  particle: { position: 'absolute', left: 0, top: 0 },
  columns: { position: 'absolute', left: 0, right: 0, flexDirection: 'row' },
  column: { flex: 1, alignItems: 'center', gap: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  split: { position: 'absolute', left: 16, right: 16, bottom: 4, height: 4 },
});
