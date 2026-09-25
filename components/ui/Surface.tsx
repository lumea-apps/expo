import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

import { Sans } from './Typography';

function Sheen({ radius }: { radius: number }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0)']}
      style={[styles.sheen, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
    />
  );
}

/** Frosted glass for floating chrome (composer, header, sheets). */
export function Glass({
  children,
  style,
  radius = radii.lg,
  intensity = 40,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: number;
}) {
  return (
    <View
      style={[
        { borderRadius: radius, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
        style,
      ]}>
      <BlurView
        intensity={intensity}
        tint="dark"
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(16,16,22,0.55)' }]} />
      <Sheen radius={radius} />
      {children}
    </View>
  );
}

/** Lightweight translucent card for content inside scroll views (no blur cost). */
export function Card({
  children,
  style,
  radius = radii.lg,
  tint,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  tint?: string;
}) {
  return (
    <View
      style={[
        {
          borderRadius: radius,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: tint ?? colors.card,
        },
        style,
      ]}>
      <Sheen radius={radius} />
      {children}
    </View>
  );
}

export function Chip({
  label,
  onPress,
  active,
  icon,
  accent,
  style,
}: {
  label: string;
  onPress?: () => void;
  active?: boolean;
  icon?: ReactNode;
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: colors.lime, borderColor: colors.lime },
        accent &&
          !active && { borderColor: 'rgba(212,255,58,0.35)', backgroundColor: colors.limeSoft },
        pressed && { transform: [{ scale: 0.96 }], opacity: 0.85 },
        style,
      ]}>
      {icon}
      <Sans size={14} weight="medium" color={active ? colors.onAccent : colors.ink}>
        {label}
      </Sans>
    </Pressable>
  );
}

export function IconButton({
  children,
  onPress,
  size = 44,
  filled,
  style,
  label,
}: {
  children: ReactNode;
  onPress?: () => void;
  size?: number;
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: filled ? colors.lime : colors.cardStrong,
          borderWidth: filled ? 0 : 1,
          borderColor: colors.border,
        },
        pressed && { transform: [{ scale: 0.92 }] },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  style,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.primary,
        disabled && { opacity: 0.35 },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}>
      <Sans size={16} weight="semi" color={colors.onAccent}>
        {label}
      </Sans>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheen: { position: 'absolute', left: 0, right: 0, top: 0, height: 36 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  primary: {
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
});
