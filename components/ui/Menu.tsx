import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, type Tint } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

import { Icon, IconTile, type IconName } from './Icon';
import { Sans } from './Typography';

/** Inset grouped list (iOS Settings style) with hairline dividers between rows. */
export function MenuGroup({
  title,
  footer,
  children,
  style,
}: {
  title?: string;
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={style}>
      {title ? (
        <Sans size={13} weight="medium" color={colors.faint} style={styles.groupTitle}>
          {title}
        </Sans>
      ) : null}
      <View style={styles.group}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={styles.divider} />}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Sans size={12} color={colors.faint} style={styles.footer}>
          {footer}
        </Sans>
      ) : null}
    </View>
  );
}

/** One tappable row: icon tile, label (+ hint), value, and a chevron, check or custom accessory. */
export function MenuRow({
  icon,
  tint = 'gray',
  label,
  hint,
  value,
  onPress,
  chevron,
  checked,
  danger,
  right,
}: {
  icon?: IconName;
  tint?: Tint;
  label: string;
  hint?: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  checked?: boolean;
  danger?: boolean;
  right?: ReactNode;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={() => {
        haptic.select();
        onPress?.();
      }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bgSubtle }]}>
      {icon && <IconTile name={icon} tint={danger ? 'rose' : tint} size={32} />}
      <View style={{ flex: 1 }}>
        <Sans size={15} weight="medium" color={danger ? colors.rose : colors.ink}>
          {label}
        </Sans>
        {hint ? (
          <Sans size={12} color={colors.faint} style={{ marginTop: 1 }}>
            {hint}
          </Sans>
        ) : null}
      </View>
      {value ? (
        <Sans size={14} color={colors.faint} numberOfLines={1} style={{ maxWidth: '45%' }}>
          {value}
        </Sans>
      ) : null}
      {right}
      {checked !== undefined && (
        <View style={[styles.check, checked && styles.checkOn]}>
          {checked && <Icon name="check-linear" size={14} color={colors.onAccent} />}
        </View>
      )}
      {chevron && <Icon name="alt-arrow-right-linear" size={16} color={colors.faint} />}
    </Pressable>
  );
}

/** Big square shortcuts at the top of a sheet (camera, photos, water…). */
export function ActionTiles({
  items,
}: {
  items: { icon: IconName; tint: Tint; label: string; onPress: () => void }[];
}) {
  return (
    <View style={styles.tiles}>
      {items.map((it) => (
        <Pressable
          key={it.label}
          onPress={() => {
            haptic.tap();
            it.onPress();
          }}
          style={({ pressed }) => [styles.tile, pressed && { backgroundColor: colors.bgMuted }]}>
          <IconTile name={it.icon} tint={it.tint} size={40} />
          <Sans size={13} weight="medium" center>
            {it.label}
          </Sans>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  groupTitle: { marginLeft: 16, marginBottom: 8 },
  group: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 60 },
  footer: { marginHorizontal: 16, marginTop: 8, lineHeight: 17 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    minHeight: 56,
    paddingVertical: 10,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  tiles: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSubtle,
  },
});
