import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Sans } from '@/components/ui/Typography';
import { WidgetView } from '@/components/widgets';
import { colors } from '@/constants/theme';
import { useNouri } from '@/lib/store';
import type { ChatMessage } from '@/lib/types';

import { RichText } from './RichText';

export function MessageView({
  message,
  afterPhoto,
  onSend,
}: {
  message: ChatMessage;
  afterPhoto?: boolean;
  onSend: (text: string) => void;
}) {
  if (message.role === 'user') return <UserMessage message={message} />;
  return <AssistantMessage message={message} afterPhoto={afterPhoto} onSend={onSend} />;
}

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.userWrap}>
      {message.imageUri ? (
        <Image source={{ uri: message.imageUri }} style={styles.photo} resizeMode="cover" />
      ) : null}
      {message.text ? (
        <View style={styles.userBubble}>
          <Sans size={16} style={{ lineHeight: 23 }}>
            {message.text}
          </Sans>
        </View>
      ) : null}
    </Animated.View>
  );
}

function AssistantMessage({
  message,
  afterPhoto,
  onSend,
}: {
  message: ChatMessage;
  afterPhoto?: boolean;
  onSend: (text: string) => void;
}) {
  const fresh = useNouri((s) => Boolean(s.fresh[message.id]));
  const settle = useNouri((s) => s.settle);
  const [textDone, setTextDone] = useState(!fresh);

  useEffect(() => {
    if (!fresh || !textDone) return;
    const t = setTimeout(() => settle(message.id), 1200);
    return () => clearTimeout(t);
  }, [fresh, textDone, settle, message.id]);

  const widgets = message.widgets ?? [];

  return (
    <View style={styles.assistantWrap}>
      {message.text ? (
        <RichText text={message.text} stream={fresh} onDone={() => setTextDone(true)} />
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
              fromPhoto={afterPhoto}
            />
          </Animated.View>
        ))}
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
});
