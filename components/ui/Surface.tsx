import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, shadow } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

import { Sans } from './Typography';

/** Frosted white for floating chrome (composer, header pill). */
export function Glass({
  children,
  style,
  radius = radii.lg,
  elevated = true,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  elevated?: boolean;
}) {
  return (
    <View
      style={[
        { borderRadius: radius, borderWidth: 1, borderColor: colors.border },
        elevated && shadow,
        { backgroundColor: 'rgba(255,255,255,0.92)' },
        style,
      ]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
        <BlurView
          intensity={30}
          tint="light"
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={StyleSheet.absoluteFill}
        />
      </View>
      {children}
    </View>
  );
}

/** Content card: white with a hairline border. */
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
      {children}
    </View>
  );
}

export function Chip({
  label,
  onPress,
  active,
  icon,
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
        active && { backgroundColor: colors.accent, borderColor: colors.accent },
        pressed && !active && { backgroundColor: colors.bgSubtle },
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
  size = 40,
  filled,
  style,
  label,
  disabled,
}: {
  children: ReactNode;
  onPress?: () => void;
  size?: number;
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      disabled={disabled}
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
          backgroundColor: filled ? colors.accent : 'transparent',
        },
        disabled && filled && { backgroundColor: colors.bgMuted },
        pressed && { opacity: 0.7 },
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
  variant = 'solid',
}: {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
}) {
  const solid = variant === 'solid';
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.primary,
        !solid && styles.outline,
        disabled && { opacity: 0.35 },
        pressed && { opacity: 0.8 },
        style,
      ]}>
      <Sans size={15} weight="medium" color={solid ? colors.onAccent : colors.ink}>
        {label}
      </Sans>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  primary: {
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
  },
  outline: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
});
