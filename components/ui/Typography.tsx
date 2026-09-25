import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, fonts } from '@/constants/theme';

type Props = TextProps & { size?: number; color?: string; center?: boolean };

function base(
  size: number,
  color: string,
  family: string,
  lh: number,
  center?: boolean
): TextStyle {
  return {
    fontFamily: family,
    fontSize: size,
    lineHeight: Math.round(size * lh),
    color,
    textAlign: center ? 'center' : undefined,
  };
}

/** Headlines: Geist Medium with tight tracking. `muted` gives the grey second half of two-tone titles. */
export function Display({
  size = 32,
  color,
  muted,
  center,
  style,
  ...rest
}: Props & { muted?: boolean }) {
  return (
    <Text
      {...rest}
      style={[
        base(size, color ?? (muted ? colors.faint : colors.ink), fonts.sansMedium, 1.12, center),
        { letterSpacing: -size * 0.03 },
        style,
      ]}
    />
  );
}

const sansWeights = {
  regular: fonts.sans,
  medium: fonts.sansMedium,
  semi: fonts.sansSemi,
  bold: fonts.sansBold,
} as const;

/** UI and body text (Geist). */
export function Sans({
  size = 15,
  color = colors.ink,
  weight = 'regular',
  center,
  style,
  ...rest
}: Props & { weight?: keyof typeof sansWeights }) {
  return (
    <Text
      {...rest}
      style={[base(size, color, sansWeights[weight], 1.45, center), { letterSpacing: -0.1 }, style]}
    />
  );
}

/** Numbers and small labels: Geist with tabular figures so digits line up. */
export function Mono({
  size = 11,
  color = colors.faint,
  weight = 'regular',
  upper,
  center,
  style,
  ...rest
}: Props & { weight?: 'regular' | 'medium'; upper?: boolean }) {
  return (
    <Text
      {...rest}
      style={[
        base(size, color, weight === 'medium' ? fonts.monoMedium : fonts.mono, 1.3, center),
        { fontVariant: ['tabular-nums'] },
        upper && { textTransform: 'uppercase', letterSpacing: 0.6 },
        style,
      ]}
    />
  );
}
