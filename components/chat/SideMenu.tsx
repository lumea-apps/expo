import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
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
import { MenuGroup, MenuRow } from '@/components/ui/Menu';
import { Orb } from '@/components/ui/Orb';
import { useSheet, type CloseSheet } from '@/components/ui/Sheet';
import { PrimaryButton } from '@/components/ui/Surface';
import { Sans } from '@/components/ui/Typography';
import { colors, fonts, radii } from '@/constants/theme';
import { normalize } from '@/lib/foods';
import { haptic } from '@/lib/haptics';
import { dayKey, formatKcal, goalLabels } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';
import type { Thread } from '@/lib/types';

const WIDTH = 312;

const MONTHS = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' });

/** "Oggi", "Ieri", "Ultimi 7 giorni", "Ultimi 30 giorni", then month by month. */
function groupOf(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const today = dayKey(now);
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (dayKey(d) === today) return 'Oggi';
  if (dayKey(d) === dayKey(y)) return 'Ieri';
  const days = (now.getTime() - d.getTime()) / 86_400_000;
  if (days < 7) return 'Ultimi 7 giorni';
  if (days < 30) return 'Ultimi 30 giorni';
  const m = MONTHS.format(d);
  return m.charAt(0).toUpperCase() + m.slice(1);
}

/** Left drawer, ChatGPT-style: new conversation, search, past conversations by date, profile. */
export function SideMenu({
  visible,
  onClose,
  onNewChat,
}: {
  visible: boolean;
  onClose: () => void;
  onNewChat: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheet = useSheet();
  const profile = useNouri((s) => s.profile);
  const threads = useNouri((s) => s.threads);
  const activeId = useNouri((s) => s.threadId);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      drag.value = 0;
      progress.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    } else {
      setQuery('');
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

  // search matches titles and what was said in the conversation
  const groups = useMemo(() => {
    const q = normalize(query);
    const list = q
      ? threads.filter(
          (t) =>
            normalize(t.title).includes(q) || t.messages.some((m) => normalize(m.text).includes(q))
        )
      : threads;
    const out: { title: string; items: Thread[] }[] = [];
    for (const t of list) {
      const g = groupOf(t.updatedAt);
      const last = out[out.length - 1];
      if (last?.title === g) last.items.push(t);
      else out.push({ title: g, items: [t] });
    }
    return out;
  }, [threads, query]);

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

  const go = (fn: () => void) => {
    onClose();
    setTimeout(fn, 180);
  };

  const open = (t: Thread) => {
    haptic.select();
    useNouri.getState().openThread(t.id);
    onClose();
  };

  const options = (t: Thread) =>
    sheet.open({
      title: t.title,
      subtitle: `${t.messages.length} messaggi`,
      render: (close) => (
        <MenuGroup>
          <MenuRow
            icon="pen-new-square-bold-duotone"
            tint="gray"
            label="Rinomina"
            onPress={() =>
              close(() =>
                sheet.open({
                  title: 'Rinomina la conversazione',
                  render: (c) => <RenameThread thread={t} close={c} />,
                })
              )
            }
          />
          <MenuRow
            icon="trash-bin-trash-bold-duotone"
            label="Elimina"
            danger
            onPress={() =>
              close(() => {
                useNouri.getState().deleteThread(t.id);
                haptic.tap();
              })
            }
          />
        </MenuGroup>
      ),
    });

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
            <Sans size={18} weight="semi" style={{ letterSpacing: -0.4, flex: 1 }}>
              Nouri
            </Sans>
          </View>

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

          <View style={styles.search}>
            <Icon name="magnifer-linear" size={16} color={colors.faint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Cerca nelle conversazioni"
              placeholderTextColor={colors.faint}
              selectionColor={colors.ink}
              style={styles.searchInput}
            />
            {query ? (
              <Pressable accessibilityLabel="Cancella" hitSlop={8} onPress={() => setQuery('')}>
                <Icon name="close-circle-bold" size={16} color={colors.faint} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {groups.length === 0 ? (
              <Sans size={13} color={colors.faint} style={styles.empty}>
                {query
                  ? 'Nessuna conversazione con queste parole.'
                  : 'Le tue conversazioni compariranno qui.'}
              </Sans>
            ) : null}
            {groups.map((g) => (
              <View key={g.title} style={{ marginTop: 14 }}>
                <Sans size={12} weight="medium" color={colors.faint} style={styles.section}>
                  {g.title}
                </Sans>
                {g.items.map((t) => {
                  const on = t.id === activeId;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => open(t)}
                      onLongPress={() => {
                        haptic.tap();
                        options(t);
                      }}
                      style={({ pressed }) => [
                        styles.thread,
                        on && { backgroundColor: colors.bgMuted },
                        pressed && !on && { backgroundColor: colors.bgSubtle },
                      ]}>
                      <Sans
                        size={14}
                        weight={on ? 'medium' : 'regular'}
                        numberOfLines={1}
                        style={{ flex: 1 }}>
                        {t.title}
                      </Sans>
                      <Pressable
                        accessibilityLabel={`Opzioni per ${t.title}`}
                        hitSlop={8}
                        onPress={() => options(t)}
                        style={styles.more}>
                        <Icon name="menu-dots-bold" size={16} color={colors.faint} />
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            ))}
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
                {goalLabels[profile.goal]} · {formatKcal(profile.targets.kcal)} kcal
              </Sans>
            </View>
            <Icon name="settings-linear" size={20} color={colors.dim} />
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function RenameThread({ thread, close }: { thread: Thread; close: CloseSheet }) {
  const [title, setTitle] = useState(thread.title);
  const save = () => {
    if (!title.trim()) return;
    useNouri.getState().renameThread(thread.id, title);
    haptic.success();
    close();
  };
  return (
    <View style={{ gap: 14 }}>
      <TextInput
        value={title}
        onChangeText={setTitle}
        autoFocus
        selectTextOnFocus
        maxLength={60}
        returnKeyType="done"
        onSubmitEditing={save}
        selectionColor={colors.ink}
        style={styles.rename}
      />
      <PrimaryButton label="Salva" disabled={!title.trim()} onPress={save} />
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
    marginBottom: 14,
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
    marginTop: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 14,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  section: { marginLeft: 10, marginBottom: 4 },
  empty: { marginTop: 18, marginHorizontal: 10, lineHeight: 19 },
  thread: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingLeft: 10,
    paddingRight: 4,
    borderRadius: radii.sm,
  },
  more: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
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
  rename: {
    height: 50,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    color: colors.ink,
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
});
