import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/ui/Icon';
import { MenuGroup, MenuRow } from '@/components/ui/Menu';
import { useSheet } from '@/components/ui/Sheet';
import { Sans } from '@/components/ui/Typography';
import { WidgetView } from '@/components/widgets';
import { colors } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { formatTime } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';
import type { ChatMessage } from '@/lib/types';
import { plain, speak } from '@/lib/useSend';

import { RichText } from './RichText';

export function MessageView({
  message,
  photoUri,
  onSend,
}: {
  message: ChatMessage;
  /** For a reply: the photo in the message it answers. */
  photoUri?: string;
  onSend: (text: string) => void;
}) {
  if (message.role === 'user') return <UserMessage message={message} onSend={onSend} />;
  return <AssistantMessage message={message} photoUri={photoUri} onSend={onSend} />;
}

function useMessageMenu(message: ChatMessage, onSend: (text: string) => void) {
  const sheet = useSheet();
  return () =>
    sheet.open({
      subtitle: `${message.role === 'user' ? 'Tu' : 'Nouri'} · ${formatTime(message.at)}`,
      render: (close) => (
        <MenuGroup>
          {message.text ? (
            <MenuRow
              icon="copy-bold-duotone"
              tint="blue"
              label="Copia il testo"
              onPress={() => close(() => Clipboard.setStringAsync(plain(message.text)))}
            />
          ) : null}
          {message.role === 'assistant' && message.text ? (
            <MenuRow
              icon="volume-loud-bold-duotone"
              tint="violet"
              label="Leggi ad alta voce"
              onPress={() => close(() => speak(message.text))}
            />
          ) : null}
          {message.role === 'user' && message.text ? (
            <MenuRow
              icon="refresh-bold-duotone"
              tint="mint"
              label="Chiedi di nuovo"
              onPress={() => close(() => onSend(message.text))}
            />
          ) : null}
        </MenuGroup>
      ),
    });
}

function UserMessage({
  message,
  onSend,
}: {
  message: ChatMessage;
  onSend: (text: string) => void;
}) {
  const openMenu = useMessageMenu(message, onSend);
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.userWrap}>
      {message.imageUri ? (
        <Image source={{ uri: message.imageUri }} style={styles.photo} resizeMode="cover" />
      ) : null}
      {message.text ? (
        <Pressable onLongPress={openMenu} delayLongPress={350} style={styles.userBubble}>
          <Sans size={16} style={{ lineHeight: 23 }}>
            {message.text}
          </Sans>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

function ActionIcon({
  name,
  label,
  onPress,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.bgMuted }]}>
      <Icon name={name} size={18} color={colors.dim} />
    </Pressable>
  );
}

function AssistantMessage({
  message,
  photoUri,
  onSend,
}: {
  message: ChatMessage;
  photoUri?: string;
  onSend: (text: string) => void;
}) {
  const fresh = useNouri((s) => Boolean(s.fresh[message.id]));
  const settle = useNouri((s) => s.settle);
  const [textDone, setTextDone] = useState(!fresh);
  const [copied, setCopied] = useState(false);
  const openMenu = useMessageMenu(message, onSend);

  useEffect(() => {
    if (!fresh || !textDone) return;
    const t = setTimeout(() => settle(message.id), 1200);
    return () => clearTimeout(t);
  }, [fresh, textDone, settle, message.id]);

  const widgets = message.widgets ?? [];

  return (
    <View style={styles.assistantWrap}>
      {message.text ? (
        <Pressable onLongPress={openMenu} delayLongPress={350}>
          <RichText text={message.text} stream={fresh} onDone={() => setTextDone(true)} />
        </Pressable>
      ) : null}
      {textDone &&
        widgets.map((w, i) => (
          <Animated.View
            key={i}
            entering={fresh ? FadeInDown.delay(i * 120).duration(380) : undefined}
            style={{ marginTop: 14 }}>
            <WidgetView
              widget={w}
              widgetKey={`${message.id}:${i}`}
              onSend={onSend}
              photoUri={photoUri}
              animate={fresh}
            />
          </Animated.View>
        ))}
      {textDone && message.text ? (
        <Animated.View entering={FadeIn.delay(fresh ? 400 : 0)} style={styles.actions}>
          <ActionIcon
            name={copied ? 'check-linear' : 'copy-linear'}
            label="Copia"
            onPress={() => {
              Clipboard.setStringAsync(plain(message.text)).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            }}
          />
          <ActionIcon
            name="volume-loud-linear"
            label="Leggi ad alta voce"
            onPress={() => speak(message.text)}
          />
          <ActionIcon name="menu-dots-bold" label="Altro" onPress={openMenu} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  userWrap: { alignItems: 'flex-end', gap: 8, marginLeft: 56 },
  userBubble: {
    backgroundColor: colors.bgMuted,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  photo: {
    width: 180,
    height: 180,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assistantWrap: { gap: 4 },
  actions: { flexDirection: 'row', gap: 2, marginTop: 6, marginLeft: -6 },
  action: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
