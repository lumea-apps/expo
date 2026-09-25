import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { Rings } from '@/components/ui/MacroRing';
import { Orb } from '@/components/ui/Orb';
import { IconButton } from '@/components/ui/Surface';
import { Mono, Sans } from '@/components/ui/Typography';
import { colors, radii } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { dayTotals, formatKcal } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';

/** Top bar: menu, wordmark, quick search and today's calories (opens "Oggi"). */
export function ChatHeader({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const thinking = useNouri((s) => s.thinking);
  const meals = useNouri((s) => s.meals);
  const profile = useNouri((s) => s.profile);
  const t = dayTotals(meals);
  const T = profile?.targets;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[colors.bg, colors.bg, 'rgba(255,255,255,0)']}
        locations={[0, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.row}>
        <IconButton label="Apri il menu" onPress={onMenu} size={40}>
          <Icon name="hamburger-menu-linear" size={24} />
        </IconButton>
        <View style={styles.brand}>
          <Orb size={20} shadow={false} state={thinking ? 'thinking' : 'idle'} />
          <Sans size={18} weight="semi" style={{ letterSpacing: -0.4 }}>
            Nouri
          </Sans>
        </View>

        <IconButton
          label="Cerca valori nutrizionali"
          size={36}
          onPress={() => router.push('/search')}
          style={styles.search}>
          <Icon name="magnifer-linear" size={19} />
        </IconButton>
        <Pressable
          accessibilityLabel="Apri la giornata"
          onPress={() => {
            haptic.tap();
            router.push('/today');
          }}
          style={({ pressed }) => [styles.pulse, pressed && { backgroundColor: colors.bgMuted }]}>
          {T && (
            <Rings
              size={20}
              stroke={3}
              gap={0}
              rings={[{ progress: t.kcal / T.kcal, color: colors.ink }]}
            />
          )}
          <Mono size={13} weight="medium" color={colors.ink}>
            {formatKcal(t.kcal)}
          </Mono>
          <Mono size={12}>/ {T ? formatKcal(T.kcal) : '—'}</Mono>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingBottom: 20,
    zIndex: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  search: { backgroundColor: colors.bgSubtle, borderWidth: 1, borderColor: colors.border },
  pulse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 8,
    paddingRight: 12,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
