import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { colors } from '@/constants/theme';

import { Icon } from './Icon';
import { Sans } from './Typography';

/** A short confirmation ("Aggiunto…") that fades away on its own. */
export function useToast(duration = 1800) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback(
    (m: string) => {
      setMessage(m);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), duration);
    },
    [duration]
  );
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  return { message, show };
}

export function Toast({ message, bottom = 32 }: { message: string | null; bottom?: number }) {
  if (!message) return null;
  return (
    <Animated.View
      key={message}
      entering={FadeInDown.duration(220)}
      exiting={FadeOut.duration(180)}
      pointerEvents="none"
      style={[styles.toast, { bottom }]}>
      <Icon name="check-circle-bold" size={18} color={colors.onAccent} />
      <Sans size={14} weight="medium" color={colors.onAccent} numberOfLines={1}>
        {message}
      </Sans>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '88%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.ink,
    zIndex: 2000,
  },
});
