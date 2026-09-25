import { useRouter } from 'expo-router';
import { Trash2, X } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MacroBar, Rings } from '@/components/ui/MacroRing';
import { Card, IconButton, PrimaryButton } from '@/components/ui/Surface';
import { Display, Mono, Sans } from '@/components/ui/Typography';
import { InsightCard, WaterCard } from '@/components/widgets/DataCards';
import { colors, radii } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { dayTotals, formatKcal, formatTime, mealsOn, mealTotals } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';
import { useAnimatedNumber } from '@/lib/useAnimatedNumber';
import { useSend } from '@/lib/useSend';

function longDate(d = new Date()): string {
  const s = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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
        title: 'Ancora niente nel diario',
        body: 'Racconta a Nouri il primo pasto, anche solo “cappuccino e cornetto”.',
      };
    const p = t.protein / T.protein;
    const k = t.kcal / T.kcal;
    if (k > 1.1)
      return {
        tone: 'warning' as const,
        title: 'Giornata piena',
        body: 'Sei sopra il piano. Domani pasti normali e tanta verdura, niente compensazioni drastiche.',
      };
    if (p >= k)
      return {
        tone: 'positive' as const,
        title: 'Buon equilibrio',
        body: `Proteine al ${Math.round(p * 100)}% con il ${Math.round(k * 100)}% delle calorie: è il ritmo che ti tiene sazio.`,
      };
    return {
      tone: 'neutral' as const,
      title: 'Spazio per le proteine',
      body: `Mancano ${Math.max(0, T.protein - t.protein)} g. Al prossimo pasto: pesce, legumi, uova o yogurt greco.`,
    };
  })();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}>
        <View style={styles.top}>
          <View>
            <Display size={28}>Oggi</Display>
            <Sans size={14} color={colors.faint}>
              {longDate()}
            </Sans>
          </View>
          <IconButton label="Chiudi" onPress={() => router.back()} style={styles.close}>
            <X size={18} color={colors.ink} />
          </IconButton>
        </View>

        <Animated.View
          entering={FadeIn.duration(500)}
          style={{ alignItems: 'center', marginTop: 20 }}>
          <Rings
            size={220}
            stroke={12}
            gap={4}
            rings={[
              { progress: t.kcal / T.kcal, color: colors.ink },
              { progress: t.protein / T.protein, color: colors.protein },
              { progress: t.carbs / T.carbs, color: colors.carbs },
              { progress: t.fat / T.fat, color: colors.fat },
            ]}>
            <Mono
              size={36}
              weight="medium"
              color={colors.ink}
              style={{ letterSpacing: -1.4, lineHeight: 42 }}>
              {formatKcal(eaten)}
            </Mono>
            <Sans size={13} color={colors.faint}>
              di {formatKcal(T.kcal)} kcal
            </Sans>
          </Rings>
        </Animated.View>

        <View style={styles.macros}>
          {[
            { l: 'Proteine', v: t.protein, t: T.protein, c: colors.protein },
            { l: 'Carboidrati', v: t.carbs, t: T.carbs, c: colors.carbs },
            { l: 'Grassi', v: t.fat, t: T.fat, c: colors.fat },
          ].map((m, i) => (
            <View key={m.l} style={{ flex: 1, gap: 6 }}>
              <Sans size={12} color={colors.faint}>
                {m.l}
              </Sans>
              <Mono size={15} weight="medium" color={colors.ink}>
                {Math.round(m.v)}
                <Mono size={12}> / {m.t} g</Mono>
              </Mono>
              <MacroBar progress={m.v / m.t} color={m.c} delay={300 + i * 100} />
            </View>
          ))}
        </View>

        <View style={{ marginTop: 24 }}>
          <WaterCard />
        </View>

        <Sans size={15} weight="semi" style={{ marginTop: 28, marginBottom: 10 }}>
          Diario
        </Sans>
        {list.length === 0 ? (
          <Card style={{ padding: 18 }}>
            <Sans size={14} color={colors.dim}>
              Ancora niente qui. Scrivi a Nouri cosa hai mangiato o mandagli una foto.
            </Sans>
          </Card>
        ) : (
          <Card>
            {list.map((m, i) => {
              const mt = mealTotals(m);
              return (
                <Animated.View
                  key={m.id}
                  layout={LinearTransition}
                  style={[styles.meal, i > 0 && styles.divider]}>
                  <Mono size={12} style={{ width: 40 }}>
                    {formatTime(m.at)}
                  </Mono>
                  <View style={styles.tile}>
                    <Sans size={17}>{m.emoji}</Sans>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Sans size={14} weight="medium" numberOfLines={1}>
                      {m.title}
                    </Sans>
                    <Sans size={12} color={colors.faint}>
                      {m.label} · P {mt.protein} · C {mt.carbs} · G {mt.fat}
                    </Sans>
                  </View>
                  <Mono size={13} color={colors.ink}>
                    {formatKcal(mt.kcal)}
                  </Mono>
                  <Pressable
                    accessibilityLabel="Elimina pasto"
                    hitSlop={10}
                    onPress={() => {
                      haptic.tap();
                      removeMeal(m.id);
                    }}>
                    <Trash2 size={15} color={colors.faint} />
                  </Pressable>
                </Animated.View>
              );
            })}
          </Card>
        )}

        <View style={{ marginTop: 16 }}>
          <InsightCard tone={note.tone} title={note.title} body={note.body} />
        </View>

        <PrimaryButton
          label="Parlane con Nouri"
          style={{ marginTop: 20 }}
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
  close: { backgroundColor: colors.bgMuted },
  macros: { flexDirection: 'row', gap: 16, marginTop: 28 },
  meal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  divider: { borderTopWidth: 1, borderColor: colors.border },
  tile: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
