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

/** Editorial display type (Instrument Serif). */
export function Serif({
  size = 34,
  color = colors.ink,
  italic,
  center,
  style,
  ...rest
}: Props & { italic?: boolean }) {
  return (
    <Text
      {...rest}
      style={[
        base(size, color, italic ? fonts.serifItalic : fonts.serif, 1.08, center),
        { letterSpacing: -0.3 },
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

/** UI / body type (Inter Tight). */
export function Sans({
  size = 15,
  color = colors.ink,
  weight = 'regular',
  center,
  style,
  ...rest
}: Props & { weight?: keyof typeof sansWeights }) {
  return <Text {...rest} style={[base(size, color, sansWeights[weight], 1.45, center), style]} />;
}

/** Numbers, labels, timestamps (JetBrains Mono). */
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
        upper && { textTransform: 'uppercase', letterSpacing: 1.2 },
        style,
      ]}
    />
  );
}
