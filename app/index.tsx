import { Redirect } from 'expo-router';
import { Fragment, useCallback, useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Composer } from '@/components/chat/Composer';
import { DayDivider } from '@/components/chat/DayDivider';
import { Greeting } from '@/components/chat/Greeting';
import { ChatHeader } from '@/components/chat/Header';
import { MessageView } from '@/components/chat/MessageView';
import { Thinking } from '@/components/chat/Thinking';
import { Aurora } from '@/components/ui/Aurora';
import { colors } from '@/constants/theme';
import type { UserInput } from '@/lib/ai';
import { dailyBrief } from '@/lib/ai/local';
import { dayKey } from '@/lib/nutrition';
import { pickMealPhoto } from '@/lib/pickImage';
import { useNouri } from '@/lib/store';
import { useSend } from '@/lib/useSend';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const hydrated = useNouri((s) => s.hydrated);
  const profile = useNouri((s) => s.profile);
  const messages = useNouri((s) => s.messages);
  const thinking = useNouri((s) => s.thinking);
  const send = useSend();

  const scroll = useRef<ScrollView>(null);
  // Follow the conversation unless the user scrolled up to read. Scroll events
  // fired by our own auto-scroll are ignored for a moment so they can't unstick it.
  const stick = useRef(true);
  const autoScrollAt = useRef(0);
  const toEnd = useCallback(() => {
    autoScrollAt.current = Date.now();
    scroll.current?.scrollToEnd({ animated: true });
  }, []);

  const sendInput = useCallback(
    (input: UserInput) => {
      stick.current = true;
      send(input);
    },
    [send]
  );
  const sendText = useCallback((text: string) => sendInput({ text }), [sendInput]);
  const sendPhoto = useCallback(async () => {
    const img = await pickMealPhoto('library');
    if (img) sendInput({ text: '', image: img });
  }, [sendInput]);

  // First open of a new day: Nouri starts the conversation with a short brief.
  const hasProfile = Boolean(profile);
  useEffect(() => {
    if (!hydrated || !hasProfile) return;
    const s = useNouri.getState();
    const today = dayKey();
    if (s.lastBrief === today) return;
    s.markBrief(today);
    const last = s.messages[s.messages.length - 1];
    if (!last || dayKey(last.at) === today || !s.profile) return;
    const brief = dailyBrief({
      profile: s.profile,
      meals: s.meals,
      waterToday: s.water[today] ?? 0,
      history: s.messages,
    });
    s.pushMessage(
      {
        role: 'assistant',
        text: brief.text,
        widgets: brief.widgets,
        suggestions: brief.suggestions,
        engine: 'local',
      },
      true
    );
  }, [hydrated, hasProfile]);

  useEffect(() => {
    if (!messages.length && !thinking) return;
    const t = setTimeout(toEnd, 60);
    return () => clearTimeout(t);
  }, [messages.length, thinking, toEnd]);

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (!profile) return <Redirect href="/onboarding" />;

  const last = messages[messages.length - 1];
  const suggestions = !thinking && last?.role === 'assistant' ? (last.suggestions ?? []) : [];
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Aurora preset="chat" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: insets.top + 76,
            paddingBottom: insets.bottom + (suggestions.length ? 150 : 104),
            paddingHorizontal: 20,
            gap: 22,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          scrollEventThrottle={32}
          onScroll={(e) => {
            if (Date.now() - autoScrollAt.current < 700) return;
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            stick.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 160;
          }}
          onContentSizeChange={() => {
            if (stick.current && messages.length) toEnd();
          }}>
          <Greeting compact={messages.length > 0} onSend={sendText} onPhoto={sendPhoto} />
          {messages.map((m, i) => (
            <Fragment key={m.id}>
              {i > 0 && dayKey(m.at) !== dayKey(messages[i - 1].at) && <DayDivider at={m.at} />}
              <MessageView
                message={m}
                afterPhoto={m.role === 'assistant' && Boolean(messages[i - 1]?.imageUri)}
                onSend={sendText}
              />
            </Fragment>
          ))}
          {thinking && <Thinking photo={Boolean(lastUser?.imageUri)} />}
        </ScrollView>

        <View
          pointerEvents="box-none"
          style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(8,8,12,0)', 'rgba(8,8,12,0.9)', colors.bg]}
            style={StyleSheet.absoluteFill}
          />
          <Composer suggestions={suggestions} disabled={thinking} onSend={sendInput} />
        </View>
      </KeyboardAvoidingView>
      <ChatHeader />
    </View>
  );
}

const styles = StyleSheet.create({
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 28,
  },
});
