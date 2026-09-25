import { useEffect, useId } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';

const noise = require('@/assets/noise.png');

interface Glow {
  color: string;
  x: number; // 0..1 of width
  y: number; // 0..1 of height
  size: number; // relative to width
  opacity: number;
  drift: number;
}

const PRESETS: Record<'chat' | 'calm' | 'vivid', Glow[]> = {
  chat: [
    { color: colors.carbs, x: 0.95, y: 0.02, size: 1.3, opacity: 0.22, drift: 40 },
    { color: colors.lime, x: 0.05, y: 0.12, size: 1.1, opacity: 0.1, drift: 30 },
    { color: colors.protein, x: 0.6, y: 1.02, size: 1.3, opacity: 0.12, drift: 50 },
  ],
  calm: [
    { color: colors.carbs, x: 0.2, y: 0.0, size: 1.3, opacity: 0.16, drift: 30 },
    { color: colors.fat, x: 1.0, y: 0.6, size: 1.0, opacity: 0.08, drift: 30 },
  ],
  vivid: [
    { color: colors.carbs, x: 0.1, y: 0.18, size: 1.4, opacity: 0.3, drift: 50 },
    { color: colors.lime, x: 0.9, y: 0.35, size: 1.1, opacity: 0.16, drift: 40 },
    { color: colors.protein, x: 0.5, y: 0.95, size: 1.4, opacity: 0.2, drift: 60 },
  ],
};

function GlowBlob({
  glow,
  width,
  height,
  index,
}: {
  glow: Glow;
  width: number;
  height: number;
  index: number;
}) {
  const id = `${useId().replace(/[^a-zA-Z0-9]/g, '')}a${index}`;
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 16000 + index * 5000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [t, index]);
  const d = width * glow.size;
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (t.value - 0.5) * glow.drift * 2 },
      { translateY: Math.sin(t.value * Math.PI) * glow.drift },
      { scale: 1 + t.value * 0.08 },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: d,
          height: d,
          left: glow.x * width - d / 2,
          top: glow.y * height - d / 2,
        },
        style,
      ]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={glow.color} stopOpacity={glow.opacity} />
            <Stop offset="0.5" stopColor={glow.color} stopOpacity={glow.opacity * 0.4} />
            <Stop offset="1" stopColor={glow.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

const TILE = 160;

/** Film grain. Tiled by hand because `resizeMode="repeat"` is not honoured on web. */
function Grain({ width, height }: { width: number; height: number }) {
  const cols = Math.ceil(width / TILE);
  const rows = Math.ceil(height / TILE);
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { flexDirection: 'row', flexWrap: 'wrap', width: cols * TILE, opacity: 0.55 },
      ]}>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <Image key={i} source={noise} style={{ width: TILE, height: TILE }} />
      ))}
    </View>
  );
}

/** Ambient, slowly drifting colour field + film grain behind every screen. */
export function Aurora({ preset = 'chat' }: { preset?: keyof typeof PRESETS }) {
  const { width, height } = useWindowDimensions();
  const w = Math.min(width, 430);
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, overflow: 'hidden' }]}>
      {PRESETS[preset].map((g, i) => (
        <GlowBlob key={`${preset}${i}`} glow={g} width={w} height={height} index={i} />
      ))}
      <Grain width={w} height={height} />
    </View>
  );
}
