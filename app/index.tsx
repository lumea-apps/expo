import { Redirect } from 'expo-router';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Composer } from '@/components/chat/Composer';
import { DayDivider } from '@/components/chat/DayDivider';
import { Greeting } from '@/components/chat/Greeting';
import { ChatHeader } from '@/components/chat/Header';
import { MessageView } from '@/components/chat/MessageView';
import { SideMenu } from '@/components/chat/SideMenu';
import { Thinking } from '@/components/chat/Thinking';
import { SheetProvider } from '@/components/ui/Sheet';
import { colors } from '@/constants/theme';
import type { UserInput } from '@/lib/ai';
import { dailyBrief } from '@/lib/ai/local';
import { dayKey } from '@/lib/nutrition';
import { pickMealPhoto } from '@/lib/pickImage';
import { useNouri } from '@/lib/store';
import { brainContext, useSend } from '@/lib/useSend';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const hydrated = useNouri((s) => s.hydrated);
  const profile = useNouri((s) => s.profile);
  const messages = useNouri((s) => s.messages);
  const thinking = useNouri((s) => s.thinking);
  const send = useSend();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const newChat = useCallback(() => useNouri.getState().newThread(), []);

  const scroll = useRef<ScrollView>(null);
  // Follow the conversation unless the user scrolled up to read. Scroll events
  // fired by our own auto-scroll are ignored for a moment so they can't unstick it.
  const stick = useRef(true);
  const autoScrollAt = useRef(0);
  // A reply is followed until its first line reaches the header, then the view
  // stops there, so a tall card is read (and its animation seen) from the top.
  const replyTop = useRef<number | null>(null);
  const viewport = useRef(0);
  const content = useRef(0);
  const headerSpace = insets.top + 64;
  const toEnd = useCallback(() => {
    autoScrollAt.current = Date.now();
    const end = content.current - viewport.current;
    if (replyTop.current === null || end <= 0) {
      scroll.current?.scrollToEnd({ animated: true });
      return;
    }
    scroll.current?.scrollTo({
      y: Math.max(0, Math.min(end, replyTop.current - headerSpace)),
      animated: true,
    });
  }, [headerSpace]);

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

  // First open of a new day: Nouri opens a new conversation with a short brief
  // (yesterday's stays in the side menu).
  const hasProfile = Boolean(profile);
  useEffect(() => {
    if (!hydrated || !hasProfile) return;
    const s = useNouri.getState();
    const today = dayKey();
    if (s.lastBrief === today) return;
    s.markBrief(today);
    const lastActivity = s.threads[0]?.updatedAt;
    if (!lastActivity || dayKey(lastActivity) === today || !s.profile) return;
    if (s.messages.length) s.newThread();
    const ctx = brainContext([]);
    if (!ctx) return;
    const brief = dailyBrief(ctx);
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
    <SheetProvider>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scroll}
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              paddingTop: insets.top + 68,
              paddingBottom: insets.bottom + (suggestions.length ? 140 : 96),
              paddingHorizontal: 20,
              gap: 22,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            scrollEventThrottle={32}
            onLayout={(e) => {
              viewport.current = e.nativeEvent.layout.height;
            }}
            onScroll={(e) => {
              if (Date.now() - autoScrollAt.current < 700) return;
              const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
              stick.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 160;
            }}
            onContentSizeChange={(_, h) => {
              content.current = h;
              if (stick.current && messages.length) toEnd();
            }}>
            {messages.length === 0 && !thinking && (
              <Greeting onSend={sendText} onPhoto={sendPhoto} />
            )}
            {messages.map((m, i) => (
              <Fragment key={m.id}>
                {(i === 0 || dayKey(m.at) !== dayKey(messages[i - 1].at)) && (
                  <DayDivider at={m.at} />
                )}
                <View
                  onLayout={
                    i === messages.length - 1
                      ? (e) => {
                          replyTop.current = m.role === 'assistant' ? e.nativeEvent.layout.y : null;
                        }
                      : undefined
                  }>
                  <MessageView
                    message={m}
                    photoUri={m.role === 'assistant' ? messages[i - 1]?.imageUri : undefined}
                    onSend={sendText}
                  />
                </View>
              </Fragment>
            ))}
            {thinking && <Thinking photo={Boolean(lastUser?.imageUri)} />}
          </ScrollView>

          <View
            pointerEvents="box-none"
            style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0)', colors.bg, colors.bg]}
              locations={[0, 0.35, 1]}
              style={StyleSheet.absoluteFill}
            />
            <Composer suggestions={suggestions} disabled={thinking} onSend={sendInput} />
          </View>
        </KeyboardAvoidingView>
        <ChatHeader onMenu={() => setMenuOpen(true)} />
        <SideMenu visible={menuOpen} onClose={closeMenu} onNewChat={newChat} />
      </View>
    </SheetProvider>
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
