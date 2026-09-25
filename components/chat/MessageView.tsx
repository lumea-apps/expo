import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Mono, Sans } from '@/components/ui/Typography';
import { WidgetView } from '@/components/widgets';
import { colors } from '@/constants/theme';
import { formatTime } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';
import type { ChatMessage } from '@/lib/types';

import { RichText } from './RichText';

export function NouriMark({ size = 18 }: { size?: number }) {
  return (
    <LinearGradient
      colors={[colors.lime, colors.carbs, colors.protein]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  );
}

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
    <Animated.View entering={FadeInUp.springify().damping(20)} style={styles.userWrap}>
      {message.imageUri ? (
        <Image source={{ uri: message.imageUri }} style={styles.photo} resizeMode="cover" />
      ) : null}
      {message.text ? (
        <View style={styles.userBubble}>
          <Sans size={16} color={colors.onAccent} style={{ lineHeight: 22 }}>
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
      <Animated.View entering={FadeInDown.duration(400)} style={styles.assistantHead}>
        <NouriMark />
        <Sans size={13} weight="semi">
          Nouri
        </Sans>
        <Mono size={10}>{formatTime(message.at)}</Mono>
      </Animated.View>
      {message.text ? (
        <RichText text={message.text} stream={fresh} onDone={() => setTextDone(true)} />
      ) : null}
      {textDone &&
        widgets.map((w, i) => (
          <Animated.View
            key={i}
            entering={
              fresh
                ? FadeInDown.delay(i * 140)
                    .springify()
                    .damping(18)
                : undefined
            }
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
  userWrap: { alignItems: 'flex-end', gap: 8, marginLeft: 48 },
  userBubble: {
    backgroundColor: colors.ink,
    borderRadius: 22,
    borderBottomRightRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 22,
    borderBottomRightRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  assistantWrap: { gap: 8 },
  assistantHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
