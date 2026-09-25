import { Camera, LineChart, MessageCircleHeart, Sparkles } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Orb } from '@/components/ui/Orb';
import { Card } from '@/components/ui/Surface';
import { Mono, Sans, Serif } from '@/components/ui/Typography';
import { colors } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { dayTotals, formatDateStamp, formatKcal, greetingFor, labelForTime } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';

const QUESTION: Record<ReturnType<typeof labelForTime>, [string, string, string]> = {
  Colazione: ['Come ', 'iniziamo', ' la giornata?'],
  Pranzo: ['Cosa ', 'mangiamo', ' a pranzo?'],
  Spuntino: ['Un ', 'pensiero', ' per lo spuntino?'],
  Cena: ['Cosa ', 'cuciniamo', ' stasera?'],
};

/** Hero at the top of the conversation: orb, editorial greeting, bento of starters. */
export function Greeting({
  compact,
  onSend,
  onPhoto,
}: {
  compact?: boolean;
  onSend: (text: string) => void;
  onPhoto: () => void;
}) {
  const profile = useNouri((s) => s.profile);
  const meals = useNouri((s) => s.meals);
  const t = dayTotals(meals);
  const left = Math.max(0, (profile?.targets.kcal ?? 0) - t.kcal);
  const moment = labelForTime();
  const [a, em, b] = QUESTION[moment];
  const nextMeal = moment === 'Spuntino' ? 'uno spuntino' : moment.toLowerCase();

  return (
    <View style={{ paddingTop: compact ? 8 : 20, paddingBottom: 24 }}>
      {!compact && (
        <Animated.View
          entering={FadeInDown.duration(700)}
          style={{ alignItems: 'center', marginBottom: 28 }}>
          <Orb size={150} />
        </Animated.View>
      )}
      <Animated.View entering={FadeInDown.delay(120).duration(600)}>
        <Mono upper size={11}>
          {formatDateStamp()} · {formatKcal(left)} kcal disponibili
        </Mono>
        <Serif size={compact ? 34 : 44} style={{ marginTop: 10 }} color={colors.dim}>
          {greetingFor()}, {profile?.name ?? ''}.
        </Serif>
        <Serif size={compact ? 34 : 44}>
          {a}
          <Serif size={compact ? 34 : 44} italic color={colors.lime}>
            {em}
          </Serif>
          {b}
        </Serif>
      </Animated.View>

      {!compact && (
        <View style={styles.bento}>
          <Starter
            delay={250}
            wide
            color={colors.lime}
            icon={<Camera size={18} color={colors.onAccent} />}
            title="Fotografa il piatto"
            subtitle="Riconosco ingredienti e porzioni in un attimo"
            onPress={onPhoto}
            accent
          />
          <Starter
            delay={330}
            color={colors.protein}
            icon={<MessageCircleHeart size={18} color={colors.onAccent} />}
            title="Racconta un pasto"
            subtitle="“Due uova e un toast”"
            onPress={() => onSend('Ho mangiato due uova e un toast con avocado')}
          />
          <Starter
            delay={410}
            color={colors.carbs}
            icon={<Sparkles size={18} color={colors.onAccent} />}
            title={`Idee per ${nextMeal}`}
            subtitle="Su misura per i tuoi macro"
            onPress={() => onSend(`Idee per ${nextMeal}`)}
          />
          <Starter
            delay={490}
            wide
            color={colors.fat}
            icon={<LineChart size={18} color={colors.onAccent} />}
            title="Com’è andata oggi?"
            subtitle="Riepilogo, macro e un consiglio concreto"
            onPress={() => onSend('Com’è andata oggi?')}
          />
        </View>
      )}
    </View>
  );
}

function Starter({
  icon,
  title,
  subtitle,
  color,
  onPress,
  wide,
  accent,
  delay,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
  wide?: boolean;
  accent?: boolean;
  delay: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(18)}
      style={{ width: wide ? '100%' : '48.5%' }}>
      <Pressable
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        style={({ pressed }) => [pressed && { transform: [{ scale: 0.97 }] }]}>
        <Card
          style={[
            styles.starter,
            wide && { flexDirection: 'row', alignItems: 'center', minHeight: 0 },
          ]}
          tint={accent ? 'rgba(212,255,58,0.08)' : undefined}>
          <View style={[styles.icon, { backgroundColor: color }]}>{icon}</View>
          <View style={{ flex: wide ? 1 : undefined, marginTop: wide ? 0 : 18 }}>
            <Sans size={15} weight="semi">
              {title}
            </Sans>
            <Sans size={12} color={colors.faint} style={{ marginTop: 2 }}>
              {subtitle}
            </Sans>
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bento: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginTop: 26,
  },
  starter: { padding: 14, gap: 12, minHeight: 132 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
