import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { colors } from '@/constants/theme';
import { useAnimatedNumber } from '@/lib/useAnimatedNumber';

export interface RingSpec {
  progress: number; // 0..1 (values above 1 are capped)
  color: string;
}

/**
 * Concentric progress rings (outermost first). Each ring draws a faint track,
 * a soft halo and a round-capped arc that animates on change.
 */
export function Rings({
  size,
  stroke = 10,
  gap = 4,
  rings,
  children,
  delay = 0,
}: {
  size: number;
  stroke?: number;
  gap?: number;
  rings: RingSpec[];
  children?: ReactNode;
  delay?: number;
}) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          {rings.map((r, i) => (
            <Arc
              key={i}
              size={size}
              stroke={stroke}
              inset={i * (stroke + gap)}
              spec={r}
              delay={delay + i * 120}
            />
          ))}
        </G>
      </Svg>
      {children}
    </View>
  );
}

function Arc({
  size,
  stroke,
  inset,
  spec,
  delay,
}: {
  size: number;
  stroke: number;
  inset: number;
  spec: RingSpec;
  delay: number;
}) {
  const p = useAnimatedNumber(Math.max(0, Math.min(1, spec.progress)), 1100, delay);
  const r = size / 2 - stroke / 2 - inset;
  const c = 2 * Math.PI * r;
  const len = Math.max(0.0001, p) * c;
  return (
    <>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={colors.ghost}
        strokeOpacity={0.6}
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={spec.color}
        strokeOpacity={0.18}
        strokeWidth={stroke + 6}
        strokeDasharray={`${len} ${c}`}
        strokeLinecap="round"
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={spec.color}
        strokeWidth={stroke}
        strokeDasharray={`${len} ${c}`}
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
}

/** Horizontal macro bar with animated fill. */
export function MacroBar({
  progress,
  color,
  height = 6,
  delay = 0,
}: {
  progress: number;
  color: string;
  height?: number;
  delay?: number;
}) {
  const p = useAnimatedNumber(Math.max(0, Math.min(1, progress)), 1000, delay);
  return (
    <View
      style={{ height, borderRadius: height, backgroundColor: colors.ghost, overflow: 'hidden' }}>
      <View
        style={{ width: `${p * 100}%`, height, borderRadius: height, backgroundColor: color }}
      />
    </View>
  );
}
