import { StyleSheet, View } from 'react-native';

import { Mono } from '@/components/ui/Typography';
import { colors } from '@/constants/theme';
import { dayKey, formatDateStamp } from '@/lib/nutrition';

function label(iso: string): string {
  const key = dayKey(iso);
  if (key === dayKey()) return 'Oggi';
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (key === dayKey(y)) return 'Ieri';
  return formatDateStamp(new Date(iso));
}

/** Thin rule with the day name, shown where the conversation crosses midnight. */
export function DayDivider({ at }: { at: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Mono upper size={10}>
        {label(at)}
      </Mono>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
});
