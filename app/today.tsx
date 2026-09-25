import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { MacroBar, Rings } from '@/components/ui/MacroRing';
import { MenuGroup, MenuRow } from '@/components/ui/Menu';
import { SheetProvider, useSheet } from '@/components/ui/Sheet';
import { Card, IconButton, PrimaryButton } from '@/components/ui/Surface';
import { Display, Mono, Sans } from '@/components/ui/Typography';
import { InsightCard, WaterCard } from '@/components/widgets/DataCards';
import { colors, radii } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { planMealKey, servingsLabel } from '@/lib/mealplan';
import { dayKey, dayTotals, formatKcal, formatTime, mealsOn, mealTotals } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';
import type { Meal } from '@/lib/types';
import { useAnimatedNumber } from '@/lib/useAnimatedNumber';
import { useSend } from '@/lib/useSend';

function longDate(d = new Date()): string {
  const s = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Today() {
  return (
    <SheetProvider>
      <TodayContent />
    </SheetProvider>
  );
}

function TodayContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const meals = useNouri((s) => s.meals);
  const profile = useNouri((s) => s.profile);
  const removeMeal = useNouri((s) => s.removeMeal);
  const send = useSend();
  const sheet = useSheet();
  const logMeal = useNouri((s) => s.logMeal);
  const plan = useNouri((s) => s.plan);
  const planLog = useNouri((s) => s.planLog);
  const planned = plan?.days.find((d) => d.date === dayKey());

  const T = profile?.targets ?? { kcal: 2000, protein: 120, carbs: 230, fat: 65, water: 2000 };
  const t = dayTotals(meals);
  const list = mealsOn(meals);
  const eaten = useAnimatedNumber(t.kcal, 1200, 200);

  const openMeal = (m: Meal) => {
    const mt = mealTotals(m);
    sheet.open({
      title: m.title,
      subtitle: `${m.label} · ${formatTime(m.at)} · ${formatKcal(mt.kcal)} kcal`,
      render: (close) => (
        <MenuGroup>
          <MenuRow
            icon="magic-stick-3-bold-duotone"
            tint="violet"
            label="Un’alternativa più leggera"
            hint="Chiedilo a Nouri"
            onPress={() =>
              close(() => {
                router.back();
                setTimeout(() => send({ text: `Alternativa a ${m.title.toLowerCase()}` }), 350);
              })
            }
          />
          <MenuRow
            icon="refresh-bold-duotone"
            tint="mint"
            label="Registralo di nuovo adesso"
            hint="Stesso pasto, stesse porzioni"
            onPress={() =>
              close(() => {
                logMeal(
                  { title: m.title, emoji: m.emoji, label: m.label, items: m.items },
                  m.source
                );
                haptic.success();
              })
            }
          />
          <MenuRow
            icon="trash-bin-trash-bold-duotone"
            label="Elimina dal diario"
            danger
            onPress={() =>
              close(() => {
                removeMeal(m.id);
                haptic.tap();
              })
            }
          />
        </MenuGroup>
      ),
    });
  };

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
            <Icon name="close-linear" size={20} />
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
                <Animated.View key={m.id} layout={LinearTransition}>
                  <Pressable
                    accessibilityLabel={`Opzioni per ${m.title}`}
                    onPress={() => openMeal(m)}
                    style={({ pressed }) => [
                      styles.meal,
                      i > 0 && styles.divider,
                      pressed && { backgroundColor: colors.bgSubtle },
                    ]}>
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
                    <Icon name="menu-dots-bold" size={18} color={colors.faint} />
                  </Pressable>
                </Animated.View>
              );
            })}
          </Card>
        )}

        {plan && planned && (
          <>
            <View style={styles.sectionRow}>
              <Sans size={15} weight="semi">
                Dal tuo piano
              </Sans>
              <Pressable hitSlop={8} onPress={() => router.push('/meal-plan')}>
                <Sans size={13} weight="medium" color={colors.dim}>
                  Apri il piano
                </Sans>
              </Pressable>
            </View>
            <Card>
              {planned.meals.map((m, i) => {
                const key = planMealKey(plan.id, planned.date, i);
                const done = Boolean(planLog[key]);
                return (
                  <View key={key} style={[styles.meal, i > 0 && styles.divider]}>
                    <View style={styles.tile}>
                      <Sans size={17}>{m.emoji}</Sans>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Sans
                        size={14}
                        weight="medium"
                        numberOfLines={1}
                        color={done ? colors.faint : colors.ink}>
                        {m.title}
                      </Sans>
                      <Sans size={12} color={colors.faint}>
                        {m.label} · {formatKcal(m.kcal)} kcal
                      </Sans>
                    </View>
                    {done ? (
                      <Icon name="check-circle-bold" size={20} color={colors.positive} />
                    ) : (
                      <Pressable
                        accessibilityLabel={`Segna ${m.title} come mangiato`}
                        onPress={() => {
                          const meal = logMeal(
                            {
                              title: m.title,
                              emoji: m.emoji,
                              label: m.label,
                              items: [
                                {
                                  name: m.title,
                                  emoji: m.emoji,
                                  qty: servingsLabel(m.servings),
                                  kcal: m.kcal,
                                  protein: m.protein,
                                  carbs: m.carbs,
                                  fat: m.fat,
                                },
                              ],
                            },
                            'plan'
                          );
                          useNouri.getState().markPlanMeal(key, meal.id);
                          haptic.success();
                        }}
                        style={({ pressed }) => [styles.mark, pressed && { opacity: 0.7 }]}>
                        <Sans size={13} weight="medium">
                          Mangiato
                        </Sans>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </Card>
          </>
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
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 10,
  },
  mark: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
