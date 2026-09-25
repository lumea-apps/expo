import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { IconTile } from '@/components/ui/Icon';
import { Orb } from '@/components/ui/Orb';
import { Display, Sans } from '@/components/ui/Typography';
import { colors, radii } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { dayTotals, formatKcal, labelForTime } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';

const QUESTION: Record<ReturnType<typeof labelForTime>, string> = {
  Colazione: 'Com’è iniziata la giornata?',
  Pranzo: 'Cosa mangiamo a pranzo?',
  Spuntino: 'Uno spuntino?',
  Cena: 'Cosa c’è per cena?',
};

/** Empty state of the conversation: orb, a two-tone greeting and four starters. */
export function Greeting({
  onSend,
  onPhoto,
}: {
  onSend: (text: string) => void;
  onPhoto: () => void;
}) {
  const profile = useNouri((s) => s.profile);
  const meals = useNouri((s) => s.meals);
  const t = dayTotals(meals);
  const left = Math.max(0, (profile?.targets.kcal ?? 0) - t.kcal);
  const moment = labelForTime();
  const nextMeal = moment === 'Spuntino' ? 'uno spuntino' : moment.toLowerCase();

  return (
    <View style={styles.wrap}>
      <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center' }}>
        <Orb size={88} />
      </Animated.View>
      <Animated.View entering={FadeIn.delay(120).duration(500)} style={styles.title}>
        <Display size={28} center>
          Ciao {profile?.name ?? ''}
        </Display>
        <Display size={28} muted center>
          {QUESTION[moment]}
        </Display>
        <Sans size={14} color={colors.faint} center style={{ marginTop: 10 }}>
          Ti restano {formatKcal(left)} kcal per oggi
        </Sans>
      </Animated.View>

      <View style={styles.grid}>
        <Starter
          delay={220}
          icon={<IconTile name="camera-bold-duotone" tint="blue" />}
          title="Fotografa il piatto"
          subtitle="Stimo ingredienti e porzioni"
          onPress={onPhoto}
        />
        <Starter
          delay={280}
          icon={<IconTile name="plate-bold-duotone" tint="peach" />}
          title="Racconta un pasto"
          subtitle="“Due uova e un toast”"
          onPress={() => onSend('Ho mangiato due uova e un toast con avocado')}
        />
        <Starter
          delay={340}
          icon={<IconTile name="chef-hat-heart-bold-duotone" tint="amber" />}
          title={`Idee per ${nextMeal}`}
          subtitle="Sui macro che ti restano"
          onPress={() => onSend(`Idee per ${nextMeal}`)}
        />
        <Starter
          delay={400}
          icon={<IconTile name="pie-chart-2-bold-duotone" tint="violet" />}
          title="Com’è andata oggi?"
          subtitle="Riepilogo e un consiglio"
          onPress={() => onSend('Com’è andata oggi?')}
        />
      </View>
    </View>
  );
}

function Starter({
  icon,
  title,
  subtitle,
  onPress,
  delay,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={{ width: '48.5%' }}>
      <Pressable
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        style={({ pressed }) => [styles.starter, pressed && { backgroundColor: colors.bgSubtle }]}>
        {icon}
        <View style={{ gap: 2 }}>
          <Sans size={14} weight="medium">
            {title}
          </Sans>
          <Sans size={13} color={colors.faint}>
            {subtitle}
          </Sans>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', paddingBottom: 24 },
  title: { marginTop: 22, alignItems: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginTop: 32,
  },
  starter: {
    gap: 14,
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
});
