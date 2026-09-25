import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MessageCircle, Trash2, X } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aurora } from '@/components/ui/Aurora';
import { MacroBar, Rings } from '@/components/ui/MacroRing';
import { Card, IconButton, PrimaryButton } from '@/components/ui/Surface';
import { Mono, Sans, Serif } from '@/components/ui/Typography';
import { InsightCard, WaterCard } from '@/components/widgets/DataCards';
import { colors, gradientFor } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import {
  dayTotals,
  formatDateStamp,
  formatKcal,
  formatTime,
  mealsOn,
  mealTotals,
} from '@/lib/nutrition';
import { useNouri } from '@/lib/store';
import { useAnimatedNumber } from '@/lib/useAnimatedNumber';
import { useSend } from '@/lib/useSend';

export default function Today() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const meals = useNouri((s) => s.meals);
  const profile = useNouri((s) => s.profile);
  const removeMeal = useNouri((s) => s.removeMeal);
  const send = useSend();

  const T = profile?.targets ?? { kcal: 2000, protein: 120, carbs: 230, fat: 65, water: 2000 };
  const t = dayTotals(meals);
  const list = mealsOn(meals);
  const eaten = useAnimatedNumber(t.kcal, 1200, 200);

  const note = (() => {
    if (!list.length)
      return {
        tone: 'neutral' as const,
        title: 'Pagina bianca',
        body: 'Raccontami il primo pasto e il resto lo costruiamo insieme.',
      };
    const p = t.protein / T.protein;
    const k = t.kcal / T.kcal;
    if (k > 1.1)
      return {
        tone: 'warning' as const,
        title: 'Giornata piena',
        body: 'Sei sopra il target: domani colazione proteica e cena leggera, senza sensi di colpa.',
      };
    if (p >= k)
      return {
        tone: 'positive' as const,
        title: 'Ottimo equilibrio',
        body: `Le proteine (${Math.round(p * 100)}%) corrono più delle calorie (${Math.round(k * 100)}%). È il ritmo che ti tiene sazio.`,
      };
    return {
      tone: 'neutral' as const,
      title: 'Spazio per le proteine',
      body: `Ti mancano ${Math.max(0, T.protein - t.protein)} g di proteine: pesce, legumi, uova o yogurt greco al prossimo pasto.`,
    };
  })();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Aurora preset="calm" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}>
        <View style={styles.top}>
          <View>
            <Mono upper size={11}>
              {formatDateStamp()}
            </Mono>
            <Serif size={52} style={{ marginTop: 4 }}>
              Oggi
            </Serif>
          </View>
          <IconButton label="Chiudi" onPress={() => router.back()}>
            <X size={20} color={colors.ink} />
          </IconButton>
        </View>

        <Animated.View
          entering={FadeInDown.duration(600)}
          style={{ alignItems: 'center', marginTop: 12 }}>
          <Rings
            size={268}
            stroke={16}
            gap={5}
            rings={[
              { progress: t.kcal / T.kcal, color: colors.lime },
              { progress: t.protein / T.protein, color: colors.protein },
              { progress: t.carbs / T.carbs, color: colors.carbs },
              { progress: t.fat / T.fat, color: colors.fat },
            ]}>
            <Mono upper size={10}>
              Mangiate
            </Mono>
            <Mono
              size={42}
              weight="medium"
              color={colors.ink}
              style={{ letterSpacing: -1.5, lineHeight: 50 }}>
              {formatKcal(eaten)}
            </Mono>
            <Mono size={11}>DI {formatKcal(T.kcal)} KCAL</Mono>
          </Rings>
        </Animated.View>

        <View style={styles.macros}>
          {[
            { l: 'Proteine', v: t.protein, t: T.protein, c: colors.protein },
            { l: 'Carbo', v: t.carbs, t: T.carbs, c: colors.carbs },
            { l: 'Grassi', v: t.fat, t: T.fat, c: colors.fat },
          ].map((m, i) => (
            <View key={m.l} style={{ flex: 1, gap: 6 }}>
              <Mono upper size={10}>
                {m.l}
              </Mono>
              <Mono size={16} weight="medium" color={colors.ink}>
                {Math.round(m.v)}
                <Mono size={11}> / {m.t}g</Mono>
              </Mono>
              <MacroBar progress={m.v / m.t} color={m.c} delay={300 + i * 100} />
            </View>
          ))}
        </View>

        <View style={{ marginTop: 22 }}>
          <WaterCard />
        </View>

        <Serif size={30} style={{ marginTop: 30, marginBottom: 14 }}>
          Il tuo{' '}
          <Serif size={30} italic color={colors.lime}>
            diario
          </Serif>
        </Serif>

        {list.length === 0 ? (
          <Card style={{ padding: 20, alignItems: 'center' }}>
            <Sans size={30}>🍽️</Sans>
            <Sans size={14} color={colors.dim} center style={{ marginTop: 8 }}>
              Ancora niente qui. Scrivi a Nouri cosa hai mangiato, o mandagli una foto.
            </Sans>
          </Card>
        ) : (
          <View>
            {list.map((m, i) => {
              const mt = mealTotals(m);
              const [g1, g2] = gradientFor(m.title);
              return (
                <Animated.View
                  key={m.id}
                  layout={LinearTransition}
                  entering={FadeInDown.delay(i * 70)}
                  style={styles.timelineRow}>
                  <View style={styles.rail}>
                    <View style={styles.dot} />
                    {i < list.length - 1 && <View style={styles.line} />}
                  </View>
                  <Card style={styles.meal}>
                    <LinearGradient
                      colors={[g1, g2]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.tile}>
                      <Sans size={22}>{m.emoji}</Sans>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Mono size={10} upper>
                        {formatTime(m.at)} · {m.label}
                      </Mono>
                      <Sans size={15} weight="semi" numberOfLines={1} style={{ marginTop: 2 }}>
                        {m.title}
                      </Sans>
                      <Mono size={11} color={colors.dim} style={{ marginTop: 2 }}>
                        {mt.kcal} kcal · P{mt.protein} C{mt.carbs} G{mt.fat}
                      </Mono>
                    </View>
                    <Pressable
                      accessibilityLabel="Elimina pasto"
                      hitSlop={10}
                      onPress={() => {
                        haptic.tap();
                        removeMeal(m.id);
                      }}>
                      <Trash2 size={16} color={colors.faint} />
                    </Pressable>
                  </Card>
                </Animated.View>
              );
            })}
          </View>
        )}

        <View style={{ marginTop: 22 }}>
          <InsightCard tone={note.tone} title={note.title} body={note.body} />
        </View>

        <PrimaryButton
          label="Parlane con Nouri"
          icon={<MessageCircle size={18} color={colors.onAccent} />}
          style={{ marginTop: 22 }}
          onPress={() => {
            router.back();
            setTimeout(() => send({ text: 'Com’è andata oggi?' }), 350);
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  macros: { flexDirection: 'row', gap: 16, marginTop: 24 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  rail: { width: 12, alignItems: 'center', paddingTop: 22 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.lime,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  line: { flex: 1, width: 1, backgroundColor: colors.borderStrong, marginTop: 4 },
  meal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 10,
  },
  tile: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
