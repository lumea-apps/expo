import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, IconTile, type IconName } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Surface';
import { Sans } from '@/components/ui/Typography';
import { colors, tints } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import type { MemoryChange } from '@/lib/types';

const KIND: Record<MemoryChange['kind'], { icon: IconName; color: string; label: string }> = {
  like: { icon: 'heart-bold-duotone', color: tints.rose.fg, label: 'Ti piace' },
  dislike: { icon: 'dislike-bold-duotone', color: tints.gray.fg, label: 'Non ti piace' },
  note: { icon: 'notebook-minimalistic-bold-duotone', color: tints.blue.fg, label: 'Da ricordare' },
  shortcut: { icon: 'bolt-circle-bold-duotone', color: tints.amber.fg, label: 'Scorciatoia' },
  forget: { icon: 'trash-bin-minimalistic-linear', color: colors.faint, label: 'Dimenticato' },
};

/** Quiet confirmation of what Nouri just remembered (or forgot), with a way to manage it. */
export function MemoryCard({ changes, recall }: { changes: MemoryChange[]; recall?: boolean }) {
  const router = useRouter();
  const title = recall
    ? 'Cosa ricordo di te'
    : changes.every((c) => c.kind === 'forget')
      ? 'Dimenticato'
      : changes.every((c) => c.kind === 'shortcut')
        ? 'Scorciatoia salvata'
        : 'Me lo ricordo';
  return (
    <Card style={{ padding: 14 }}>
      <View style={styles.head}>
        <IconTile name="brain-bold-duotone" tint="violet" size={28} />
        <Sans size={14} weight="semi" style={{ flex: 1 }}>
          {title}
        </Sans>
        <Pressable
          hitSlop={8}
          onPress={() => {
            haptic.tap();
            router.push('/memory');
          }}>
          <Sans size={13} weight="medium" color={colors.dim}>
            Gestisci
          </Sans>
        </Pressable>
      </View>
      <View style={{ marginTop: 10, gap: 8 }}>
        {changes.map((c, i) => {
          const k = KIND[c.kind];
          return (
            <View key={`${c.kind}${c.text}${i}`} style={styles.row}>
              <Icon name={k.icon} size={18} color={k.color} />
              <Sans
                size={14}
                color={c.kind === 'forget' ? colors.faint : colors.ink}
                style={[
                  { flex: 1 },
                  c.kind === 'forget' && { textDecorationLine: 'line-through' },
                ]}>
                {c.text}
              </Sans>
              <Sans size={12} color={colors.faint}>
                {k.label}
              </Sans>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
