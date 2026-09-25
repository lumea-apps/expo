import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { Rings } from '@/components/ui/MacroRing';
import { MenuRow } from '@/components/ui/Menu';
import { Orb } from '@/components/ui/Orb';
import { Mono, Sans } from '@/components/ui/Typography';
import { colors, radii } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { dayKey, dayTotals, formatKcal, goalLabels, mealTotals } from '@/lib/nutrition';
import { logShortcut } from '@/lib/shortcuts';
import { useNouri } from '@/lib/store';

const WIDTH = 312;

/** Left drawer, ChatGPT-style: new conversation, today at a glance, tools, shortcuts, profile. */
export function SideMenu({
  visible,
  onClose,
  onSend,
  onNewChat,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
  onNewChat: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useNouri((s) => s.profile);
  const meals = useNouri((s) => s.meals);
  const water = useNouri((s) => s.water[dayKey()] ?? 0);
  const plan = useNouri((s) => s.plan);
  const memoryOn = useNouri((s) => s.memoryOn);
  const shortcuts = useNouri((s) => s.shortcuts);
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      drag.value = 0;
      progress.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    } else {
      progress.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
  }, [visible, progress, drag]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const pan = Gesture.Pan()
    .activeOffsetX(-8)
    .onUpdate((e) => {
      drag.value = Math.min(0, e.translationX);
    })
    .onEnd((e) => {
      if (drag.value < -90 || e.velocityX < -800) runOnJS(onClose)();
      else drag.value = withSpring(0, { damping: 22, stiffness: 260 });
    });

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value * 0.32 }));
  const panel = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value - 1) * (WIDTH + 20) + drag.value }],
  }));

  if (!mounted || !profile) return null;

  const t = dayTotals(meals);
  const T = profile.targets;
  const go = (fn: () => void) => {
    onClose();
    setTimeout(fn, 180);
  };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 900 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, backdrop]}>
        <Pressable
          accessibilityLabel="Chiudi il menu"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.panel,
            { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 12 },
            panel,
          ]}>
          <View style={styles.brand}>
            <Orb size={26} shadow={false} />
            <Sans size={18} weight="semi" style={{ letterSpacing: -0.4 }}>
              Nouri
            </Sans>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: 18 }}
            showsVerticalScrollIndicator={false}>
            <Pressable
              onPress={() => {
                haptic.tap();
                go(onNewChat);
              }}
              style={({ pressed }) => [
                styles.newChat,
                pressed && { backgroundColor: colors.bgMuted },
              ]}>
              <Icon name="pen-new-square-linear" size={20} />
              <Sans size={15} weight="medium">
                Nuova conversazione
              </Sans>
            </Pressable>

            <Pressable
              onPress={() => go(() => router.push('/today'))}
              style={({ pressed }) => [
                styles.today,
                pressed && { backgroundColor: colors.bgSubtle },
              ]}>
              <Rings
                size={48}
                stroke={5}
                gap={2}
                rings={[
                  { progress: t.kcal / T.kcal, color: colors.ink },
                  { progress: t.protein / T.protein, color: colors.protein },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Sans size={13} color={colors.faint}>
                  Oggi
                </Sans>
                <Sans size={15} weight="semi">
                  <Mono size={15} weight="medium" color={colors.ink}>
                    {formatKcal(t.kcal)}
                  </Mono>{' '}
                  di {formatKcal(T.kcal)} kcal
                </Sans>
                <Sans size={12} color={colors.faint}>
                  Proteine {Math.round(t.protein)} / {T.protein} g
                </Sans>
              </View>
              <Icon name="alt-arrow-right-linear" size={16} color={colors.faint} />
            </Pressable>

            <View>
              <Sans size={13} weight="medium" color={colors.faint} style={styles.section}>
                Strumenti
              </Sans>
              <MenuRow
                icon="magnifer-bold-duotone"
                tint="blue"
                label="Cerca valori nutrizionali"
                onPress={() => go(() => router.push('/search'))}
              />
              <MenuRow
                icon="calendar-bold-duotone"
                tint="violet"
                label="Piano pasti"
                value={plan ? (plan.kind === 'week' ? 'Settimana' : 'Giorno') : undefined}
                onPress={() => go(() => router.push('/meal-plan'))}
              />
              <MenuRow
                icon="brain-bold-duotone"
                tint="violet"
                label="Memoria"
                value={memoryOn ? undefined : 'Spenta'}
                onPress={() => go(() => router.push('/memory'))}
              />
              <MenuRow
                icon="notebook-bold-duotone"
                tint="gray"
                label="Diario di oggi"
                onPress={() => go(() => router.push('/today'))}
              />
            </View>

            {shortcuts.length > 0 && (
              <View>
                <Sans size={13} weight="medium" color={colors.faint} style={styles.section}>
                  Le tue scorciatoie
                </Sans>
                {shortcuts.slice(0, 4).map((sc) => (
                  <MenuRow
                    key={sc.id}
                    icon="bolt-circle-bold-duotone"
                    tint="amber"
                    label={sc.name}
                    value={`${formatKcal(mealTotals(sc.meal).kcal)} kcal`}
                    onPress={() => go(() => logShortcut(sc))}
                  />
                ))}
              </View>
            )}

            <View>
              <Sans size={13} weight="medium" color={colors.faint} style={styles.section}>
                Chiedi a Nouri
              </Sans>
              <MenuRow
                icon="chef-hat-heart-bold-duotone"
                tint="peach"
                label="Idee per il prossimo pasto"
                onPress={() => go(() => onSend('Idee per il prossimo pasto'))}
              />
              <MenuRow
                icon="chart-2-bold-duotone"
                tint="violet"
                label="Andamento della settimana"
                onPress={() => go(() => onSend('Com’è andata la settimana?'))}
              />
              <MenuRow
                icon="cart-large-2-bold-duotone"
                tint="mint"
                label="Lista della spesa"
                onPress={() => go(() => onSend('Fammi la lista della spesa'))}
              />
              <MenuRow
                icon="waterdrops-bold-duotone"
                tint="sky"
                label="Acqua"
                value={`${(water / 1000).toLocaleString('it-IT', { maximumFractionDigits: 2 })} / ${(T.water / 1000).toLocaleString('it-IT')} L`}
                onPress={() => go(() => onSend('Com’è messa l’acqua oggi?'))}
              />
              <MenuRow
                icon="soundwave-bold-duotone"
                tint="gray"
                label="Parla con Nouri"
                onPress={() => go(() => router.push('/voice'))}
              />
            </View>
          </ScrollView>

          <Pressable
            onPress={() => go(() => router.push('/profile'))}
            style={({ pressed }) => [
              styles.profile,
              pressed && { backgroundColor: colors.bgSubtle },
            ]}>
            <View style={styles.avatar}>
              <Sans size={15} weight="semi">
                {profile.name.charAt(0).toUpperCase()}
              </Sans>
            </View>
            <View style={{ flex: 1 }}>
              <Sans size={15} weight="semi">
                {profile.name}
              </Sans>
              <Sans size={12} color={colors.faint}>
                {goalLabels[profile.goal]} · {formatKcal(T.kcal)} kcal
              </Sans>
            </View>
            <Icon name="settings-linear" size={20} color={colors.dim} />
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: WIDTH,
    maxWidth: '86%',
    backgroundColor: colors.bg,
    paddingHorizontal: 10,
    borderTopRightRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    boxShadow: '8px 0 40px rgba(14, 14, 16, 0.10)',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  newChat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.bgSubtle,
  },
  today: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: { marginLeft: 8, marginBottom: 2 },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radii.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgMuted,
  },
});
