import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { Orb } from '@/components/ui/Orb';
import { Sans } from '@/components/ui/Typography';
import { colors } from '@/constants/theme';

const TEXT_STEPS = [
  'Leggo il tuo diario…',
  'Faccio due conti sui macro…',
  'Penso a cosa ti farebbe bene…',
  'Quasi pronto…',
];
const PHOTO_STEPS = [
  'Guardo il piatto…',
  'Riconosco gli ingredienti…',
  'Stimo le porzioni…',
  'Calcolo i macro…',
];

/** Replaces a spinner: the orb spins up and narrates what Nouri is doing. */
export function Thinking({ photo }: { photo?: boolean }) {
  const steps = photo ? PHOTO_STEPS : TEXT_STEPS;
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => Math.min(v + 1, steps.length - 1)), 1300);
    return () => clearInterval(id);
  }, [steps.length]);

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      exiting={FadeOut.duration(150)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Orb size={34} state="thinking" glow={false} />
      <View style={{ height: 22, justifyContent: 'center' }}>
        <Animated.View key={i} entering={FadeIn.duration(350)} exiting={FadeOut.duration(200)}>
          <Sans size={14} color={colors.dim}>
            {steps[i]}
          </Sans>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
