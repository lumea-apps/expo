import { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { colors, radii, tints, type Tint } from '@/constants/theme';

import { SOLAR, type SolarName } from './solar-icons';

export type IconName = SolarName;

/** A Solar icon (bold-duotone for content, linear/bold for controls) tinted with `color`. */
export function Icon({
  name,
  size = 22,
  color = colors.ink,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const xml = useMemo(
    () =>
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${SOLAR[name].replace(
        /currentColor/g,
        color
      )}</svg>`,
    [name, color]
  );
  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none">
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}

/** Rounded square with a pastel ground and a duotone glyph, used in lists and menus. */
export function IconTile({
  name,
  tint = 'gray',
  size = 36,
  style,
}: {
  name: IconName;
  tint?: Tint;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = tints[tint];
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size > 40 ? radii.md : radii.sm,
          backgroundColor: t.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      <Icon name={name} size={Math.round(size * 0.58)} color={t.fg} />
    </View>
  );
}
