import { useEffect, useId } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { orbColors } from '@/constants/theme';

export type OrbState = 'idle' | 'thinking' | 'listening' | 'speaking';

const ENERGY: Record<OrbState, number> = {
  idle: 0.15,
  listening: 0.55,
  speaking: 0.7,
  thinking: 1,
};

interface BlobSpec {
  color: string;
  scale: number; // blob diameter relative to orb
  orbit: number; // orbit radius relative to orb
  fx: number; // integer frequencies keep the loop seamless
  fy: number;
  phase: number;
}

const BLOBS: BlobSpec[] = [
  { color: orbColors.sky, scale: 1.05, orbit: 0.2, fx: 1, fy: 2, phase: 0 },
  { color: orbColors.lilac, scale: 0.95, orbit: 0.24, fx: 2, fy: 1, phase: 2.1 },
  { color: orbColors.peach, scale: 0.8, orbit: 0.26, fx: 1, fy: 1, phase: 4.2 },
  { color: orbColors.mint, scale: 0.7, orbit: 0.22, fx: 3, fy: 2, phase: 1.1 },
];

function SoftDisc({ color, id, opacity = 1 }: { color: string; id: string; opacity?: number }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.45" stopColor={color} stopOpacity={opacity * 0.75} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={`url(#${id})`} />
    </Svg>
  );
}

function Blob({
  spec,
  size,
  slow,
  fast,
  energy,
  id,
}: {
  spec: BlobSpec;
  size: number;
  slow: SharedValue<number>;
  fast: SharedValue<number>;
  energy: SharedValue<number>;
  id: string;
}) {
  const d = size * spec.scale;
  const style = useAnimatedStyle(() => {
    const a = slow.value * Math.PI * 2;
    const b = fast.value * Math.PI * 2;
    const r = size * spec.orbit;
    const jitter = size * 0.1 * energy.value;
    const x = Math.cos(a * spec.fx + spec.phase) * r + Math.sin(b * spec.fy + spec.phase) * jitter;
    const y = Math.sin(a * spec.fy + spec.phase) * r + Math.cos(b * spec.fx + spec.phase) * jitter;
    const s = 1 + 0.1 * Math.sin(a * 2 + spec.phase) + energy.value * 0.08 * Math.sin(b * 3);
    return { transform: [{ translateX: x }, { translateY: y }, { scale: s }] };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: d,
          height: d,
          left: (size - d) / 2,
          top: (size - d) / 2,
        },
        style,
      ]}>
      <SoftDisc color={spec.color} id={id} />
    </Animated.View>
  );
}

/**
 * Nouri's presence: a soft pastel sphere whose colours drift slowly at rest
 * and pick up pace when Nouri listens, thinks or speaks.
 */
export function Orb({
  size = 120,
  state = 'idle',
  level,
  shadow = true,
  style,
}: {
  size?: number;
  state?: OrbState;
  level?: SharedValue<number>;
  shadow?: boolean;
  style?: ViewStyle;
}) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const slow = useSharedValue(0);
  const fast = useSharedValue(0);
  const breath = useSharedValue(0);
  const energy = useSharedValue(ENERGY[state]);

  useEffect(() => {
    slow.value = withRepeat(withTiming(1, { duration: 16000, easing: Easing.linear }), -1, false);
    fast.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.linear }), -1, false);
    breath.value = withRepeat(
      withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [slow, fast, breath]);

  useEffect(() => {
    energy.value = withTiming(ENERGY[state], { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [state, energy]);

  const bodyStyle = useAnimatedStyle(() => {
    const lv = level ? level.value : 0;
    return {
      transform: [{ scale: 0.98 + breath.value * 0.025 + lv * 0.08 + energy.value * 0.015 }],
    };
  });

  const ring = useAnimatedStyle(() => {
    const t = fast.value;
    const active = state === 'listening' || state === 'speaking' ? 1 : 0;
    return { opacity: active * (1 - t) * 0.35, transform: [{ scale: 1 + t * 0.35 }] };
  });

  return (
    <View
      style={[
        { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1,
            borderColor: '#B9B9C6',
          },
          ring,
        ]}
      />
      <Animated.View
        style={[
          { width: size, height: size, borderRadius: size / 2 },
          shadow && {
            boxShadow: `0 ${Math.round(size * 0.08)}px ${Math.round(size * 0.24)}px rgba(91, 95, 136, 0.16)`,
          },
          bodyStyle,
        ]}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
            backgroundColor: '#EEF0F8',
          }}>
          {BLOBS.map((b, i) => (
            <Blob
              key={i}
              spec={b}
              size={size}
              slow={slow}
              fast={fast}
              energy={energy}
              id={`${rawId}b${i}`}
            />
          ))}
          {/* soft top-left light and a pale rim give the sphere its volume */}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                transform: [
                  { translateX: -size * 0.18 },
                  { translateY: -size * 0.24 },
                  { scale: 0.75 },
                ],
              },
            ]}>
            <SoftDisc color="#FFFFFF" id={`${rawId}h`} opacity={0.55} />
          </View>
          <View
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: size / 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
}
