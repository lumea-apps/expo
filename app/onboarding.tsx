import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RichText } from '@/components/chat/RichText';
import { Thinking } from '@/components/chat/Thinking';
import { Icon, IconTile, type IconName } from '@/components/ui/Icon';
import { Orb } from '@/components/ui/Orb';
import { SheetProvider } from '@/components/ui/Sheet';
import { Chip, Glass, IconButton, PrimaryButton } from '@/components/ui/Surface';
import { Sans } from '@/components/ui/Typography';
import { GoalCard } from '@/components/widgets/GoalCard';
import { colors, fonts, type Tint } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { uid } from '@/lib/nutrition';
import {
  extractFacts,
  FIRST_MESSAGE,
  goalPlan,
  mergeFacts,
  missing,
  onboardingReply,
  profileFrom,
} from '@/lib/onboarding';
import { useNouri } from '@/lib/store';
import type {
  Capture,
  FactKey,
  Facts,
  MemoryKind,
  OnboardingDraft,
  OnboardingMessage,
} from '@/lib/types';
import { useSend } from '@/lib/useSend';

const CAPTURE_ICON: Record<Capture['key'], { icon: IconName; tint: Tint }> = {
  name: { icon: 'user-rounded-bold-duotone', tint: 'gray' },
  goal: { icon: 'target-bold-duotone', tint: 'rose' },
  diet: { icon: 'leaf-bold-duotone', tint: 'mint' },
  avoid: { icon: 'forbidden-circle-bold-duotone', tint: 'rose' },
  weight: { icon: 'scale-bold-duotone', tint: 'blue' },
  activity: { icon: 'walking-bold-duotone', tint: 'sky' },
  like: { icon: 'heart-bold-duotone', tint: 'rose' },
  dislike: { icon: 'dislike-bold-duotone', tint: 'gray' },
};

const PLACEHOLDER: Record<FactKey, string> = {
  name: 'Il tuo nome, o raccontami di te',
  goal: 'Scrivilo con parole tue',
  food: 'Es. niente carne, senza lattosio',
  body: 'Es. 70 kg, palestra due volte',
};

/**
 * Onboarding happens once, as a conversation: the user answers in their own
 * words, Nouri asks only for what's missing and ends with the goal card.
 * Once it's done the screen sends you to the chat (even when opened
 * directly); if it's interrupted, the conversation resumes where it was.
 */
export default function Onboarding() {
  const hydrated = useNouri((s) => s.hydrated);
  const profile = useNouri((s) => s.profile);
  // decided once, when the stored state is known: finishing it here must not bounce away
  const doneBefore = useRef<boolean | null>(null);
  if (hydrated && doneBefore.current === null) doneBefore.current = Boolean(profile);

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (doneBefore.current) return <Redirect href="/" />;
  const draft = useNouri.getState().onboardingDraft;
  // drafts from the old step-by-step form have no conversation: start over
  return (
    <SheetProvider>
      <OnboardingChat draft={Array.isArray(draft?.messages) ? draft : null} />
    </SheetProvider>
  );
}

function OnboardingChat({ draft }: { draft: OnboardingDraft | null }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const send = useSend();
  const setDraft = useNouri((s) => s.setOnboardingDraft);

  const [messages, setMessages] = useState<OnboardingMessage[]>(
    () => draft?.messages ?? [{ id: 'hello', role: 'assistant', text: FIRST_MESSAGE }]
  );
  const [facts, setFacts] = useState<Facts>(draft?.facts ?? {});
  const [asked, setAsked] = useState<FactKey | null>(draft?.asked ?? 'name');
  const [chips, setChips] = useState<string[]>(draft?.chips ?? []);
  // replies that stream in; the others (resumed from a draft) are shown as they are
  const [fresh, setFresh] = useState<Set<string>>(() => new Set(draft ? [] : ['hello']));
  const [settled, setSettled] = useState<Set<string>>(
    () => new Set(draft ? draft.messages.map((m) => m.id) : [])
  );
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const done = useRef(false);
  const scroll = useRef<ScrollView>(null);

  const settle = useCallback((id: string) => setSettled((s) => new Set(s).add(id)), []);
  const finished = messages.some((m) => m.goalCard && settled.has(m.id));

  // every answer is kept, so closing the app mid-way doesn't start over
  useEffect(() => {
    if (!done.current) setDraft({ messages, facts, asked, chips });
  }, [messages, facts, asked, chips, setDraft]);

  /** Profile, memory and the first conversation, as soon as Nouri has everything. */
  const complete = (f: Facts) => {
    if (done.current) return;
    done.current = true;
    const s = useNouri.getState();
    const profile = profileFrom(f);
    s.setProfile(profile);
    const notes: { kind: MemoryKind; text: string }[] = [
      ...(f.likes ?? []).map((t) => ({ kind: 'like' as const, text: t })),
      ...(f.dislikes ?? []).map((t) => ({ kind: 'dislike' as const, text: t })),
    ];
    if (notes.length && s.memoryOn) s.remember(notes);
    // the goal card opens the chat, so it's there from the first moment
    s.newThread();
    s.pushMessage(
      {
        role: 'assistant',
        text: `Ecco la tua scheda obiettivo, ${profile.name}. La ritrovi qui, e per cambiarla basta dirmelo.`,
        widgets: [{ type: 'goal' }],
        suggestions: goalPlan(profile, { trains: profile.trains }).actions.map((a) => a.text),
        engine: 'local',
      },
      false
    );
    const id = useNouri.getState().threadId;
    if (id) s.renameThread(id, 'Il tuo obiettivo');
  };

  const answer = (raw: string) => {
    const t = raw.trim();
    if (!t || typing || finished) return;
    haptic.soft();
    setText('');
    setChips([]);
    setMessages((m) => [...m, { id: uid(), role: 'user', text: t }]);
    setTyping(true);
    setTimeout(() => {
      const { facts: next, captures } = mergeFacts(facts, extractFacts(t, asked));
      const reply = onboardingReply(next, captures, asked);
      const id = uid();
      const last = !missing(next);
      setFacts(next);
      setAsked(reply.asked);
      setChips(reply.chips);
      setFresh((f) => new Set(f).add(id));
      setMessages((m) => [
        ...m,
        { id, role: 'assistant', text: reply.text, captures, goalCard: last || undefined },
      ]);
      setTyping(false);
      if (captures.length) haptic.select();
      if (last) complete(next);
    }, 750);
  };

  const finish = (then?: string) => {
    haptic.success();
    router.replace('/');
    if (then) setTimeout(() => send({ text: then }), 450);
  };

  // follow the conversation, but stop at the start of the goal card's message
  const cardTop = useRef<number | null>(null);
  const viewport = useRef(0);
  const toEnd = (_: number, h: number) => {
    const end = h - viewport.current;
    if (cardTop.current === null || end <= 0) scroll.current?.scrollToEnd({ animated: true });
    else
      scroll.current?.scrollTo({
        y: Math.min(end, cardTop.current - insets.top - 16),
        animated: true,
      });
  };
  const lastSettled = messages.length > 0 && settled.has(messages[messages.length - 1].id);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 28,
            paddingBottom: 24,
            paddingHorizontal: 20,
            gap: 22,
          }}
          keyboardShouldPersistTaps="handled"
          onLayout={(e) => {
            viewport.current = e.nativeEvent.layout.height;
          }}
          onContentSizeChange={toEnd}>
          <Animated.View entering={FadeIn.duration(700)} style={styles.hero}>
            <Orb size={96} state={typing ? 'thinking' : finished ? 'speaking' : 'idle'} />
          </Animated.View>

          {messages.map((m) =>
            m.role === 'user' ? (
              <Animated.View key={m.id} entering={FadeIn.duration(200)} style={styles.userWrap}>
                <View style={styles.userBubble}>
                  <Sans size={16} style={{ lineHeight: 23 }}>
                    {m.text}
                  </Sans>
                </View>
              </Animated.View>
            ) : (
              <View
                key={m.id}
                style={{ gap: 12 }}
                onLayout={
                  m.goalCard
                    ? (e) => {
                        cardTop.current = e.nativeEvent.layout.y;
                      }
                    : undefined
                }>
                <RichText text={m.text} stream={fresh.has(m.id)} onDone={() => settle(m.id)} />
                {settled.has(m.id) && m.captures?.length ? (
                  <View style={styles.captures}>
                    {m.captures.map((c, i) => (
                      <Animated.View
                        key={`${c.key}${c.label}`}
                        entering={
                          fresh.has(m.id)
                            ? ZoomIn.delay(i * 110)
                                .springify()
                                .damping(14)
                            : undefined
                        }
                        style={styles.capture}>
                        <IconTile
                          name={CAPTURE_ICON[c.key].icon}
                          tint={CAPTURE_ICON[c.key].tint}
                          size={24}
                        />
                        <Sans size={13} weight="medium">
                          {c.label}
                        </Sans>
                        <Icon name="check-linear" size={14} color={colors.positive} />
                      </Animated.View>
                    ))}
                  </View>
                ) : null}
                {settled.has(m.id) && m.goalCard ? (
                  <Animated.View entering={FadeInDown.delay(250).duration(500)}>
                    <GoalCard animate onAction={finish} />
                  </Animated.View>
                ) : null}
              </View>
            )
          )}
          {typing && <Thinking steps={['Ti ascolto', 'Prendo nota']} />}
        </ScrollView>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
          {finished ? (
            <Animated.View entering={FadeInDown.duration(400)}>
              <PrimaryButton label="Iniziamo" onPress={() => finish()} />
            </Animated.View>
          ) : (
            <>
              {chips.length > 0 && lastSettled && !typing ? (
                <Animated.View entering={FadeIn.delay(150)}>
                  <ScrollView
                    horizontal
                    keyboardShouldPersistTaps="handled"
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
                    {chips.map((c) => (
                      <Chip key={c} label={c} onPress={() => answer(c)} />
                    ))}
                  </ScrollView>
                </Animated.View>
              ) : null}
              <Glass radius={26} style={styles.bar}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder={asked ? PLACEHOLDER[asked] : 'Scrivi a Nouri'}
                  placeholderTextColor={colors.faint}
                  autoFocus={Platform.OS === 'web'}
                  multiline
                  numberOfLines={Platform.OS === 'web' ? 1 : undefined}
                  selectionColor={colors.ink}
                  style={styles.input}
                  onKeyPress={(e) => {
                    const ev = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
                    if (Platform.OS === 'web' && ev.key === 'Enter' && !ev.shiftKey) {
                      (e as unknown as { preventDefault: () => void }).preventDefault();
                      answer(text);
                    }
                  }}
                />
                <IconButton
                  label="Invia"
                  filled
                  size={36}
                  disabled={!text.trim() || typing}
                  onPress={() => answer(text)}>
                  <Icon
                    name="arrow-up-linear"
                    size={20}
                    color={text.trim() ? colors.onAccent : colors.faint}
                  />
                </IconButton>
              </Glass>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 8 },
  userWrap: { alignItems: 'flex-end', marginLeft: 56 },
  userBubble: {
    backgroundColor: colors.bgMuted,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  captures: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  capture: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 34,
    paddingLeft: 5,
    paddingRight: 11,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  bottom: { gap: 10, paddingHorizontal: 16, paddingTop: 8 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, padding: 6, paddingLeft: 10 },
  input: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
    minHeight: 36,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
});
