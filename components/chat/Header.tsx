import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Rings } from '@/components/ui/MacroRing';
import { Orb } from '@/components/ui/Orb';
import { Glass } from '@/components/ui/Surface';
import { Mono, Sans, Serif } from '@/components/ui/Typography';
import { colors } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { dayTotals, formatKcal } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';

/** Floating top bar: Nouri's mark, the live "day pulse" pill and the profile avatar. */
export function ChatHeader() {
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
        colors={[colors.bg, 'rgba(8,8,12,0.94)', 'rgba(8,8,12,0)']}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.row}>
        <View style={styles.brand}>
          <Orb size={30} glow={false} state={thinking ? 'thinking' : 'idle'} />
          <Serif size={28} italic>
            Nouri
          </Serif>
        </View>

        <Pressable
          accessibilityLabel="Apri la giornata"
          onPress={() => {
            haptic.tap();
            router.push('/today');
          }}
          style={({ pressed }) => [pressed && { transform: [{ scale: 0.96 }] }]}>
          <Glass radius={999} style={styles.pulse}>
            {T && (
              <Rings
                size={26}
                stroke={3.5}
                gap={1.5}
                rings={[
                  { progress: t.kcal / T.kcal, color: colors.lime },
                  { progress: t.protein / T.protein, color: colors.protein },
                ]}
              />
            )}
            <Mono size={13} weight="medium" color={colors.ink}>
              {formatKcal(t.kcal)}
            </Mono>
            <Mono size={11}>/ {T ? formatKcal(T.kcal) : '—'}</Mono>
          </Glass>
        </Pressable>

        <Pressable
          accessibilityLabel="Profilo"
          onPress={() => {
            haptic.tap();
            router.push('/profile');
          }}>
          <LinearGradient
            colors={[colors.carbs, colors.protein]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}>
            <Sans size={15} weight="bold" color={colors.onAccent}>
              {(profile?.name ?? 'N').charAt(0).toUpperCase()}
            </Sans>
          </LinearGradient>
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
    paddingHorizontal: 16,
    paddingBottom: 30,
    zIndex: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pulse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 6,
    paddingRight: 14,
    height: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
