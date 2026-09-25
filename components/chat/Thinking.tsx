import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Orb } from '@/components/ui/Orb';
import { Sans } from '@/components/ui/Typography';
import { colors } from '@/constants/theme';

const TEXT_STEPS = [
  'Leggo il tuo diario',
  'Faccio due conti sui macro',
  'Penso a cosa ti farebbe bene',
  'Quasi pronto',
];
const PHOTO_STEPS = [
  'Guardo il piatto',
  'Riconosco gli ingredienti',
  'Stimo le porzioni',
  'Calcolo i macro',
];

/** Small orb plus a softly pulsing status line, instead of a spinner. */
export function Thinking({ photo }: { photo?: boolean }) {
  const steps = photo ? PHOTO_STEPS : TEXT_STEPS;
  const [i, setI] = useState(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    const id = setInterval(() => setI((v) => Math.min(v + 1, steps.length - 1)), 1300);
    return () => clearInterval(id);
  }, [steps.length]);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [pulse]);

  const textStyle = useAnimatedStyle(() => ({ opacity: 0.45 + pulse.value * 0.55 }));

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Orb size={22} state="thinking" shadow={false} />
      <View style={{ height: 22, justifyContent: 'center' }}>
        <Animated.View key={i} entering={FadeIn.duration(300)} style={textStyle}>
          <Sans size={15} color={colors.dim}>
            {steps[i]}
          </Sans>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
