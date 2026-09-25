import { StyleSheet, View } from 'react-native';

import { Sans } from '@/components/ui/Typography';
import { colors } from '@/constants/theme';
import { dayKey } from '@/lib/nutrition';

const DAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

function label(iso: string): string {
  const key = dayKey(iso);
  if (key === dayKey()) return 'Oggi';
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (key === dayKey(y)) return 'Ieri';
  const d = new Date(iso);
  const name = DAYS[d.getDay()];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${d.getDate()}`;
}

/** Centred day label where the conversation crosses midnight. */
export function DayDivider({ at }: { at: string }) {
  return (
    <View style={styles.row}>
      <Sans size={12} weight="medium" color={colors.faint}>
        {label(at)}
      </Sans>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', paddingVertical: 4 },
});
