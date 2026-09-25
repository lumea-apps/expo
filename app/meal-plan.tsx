import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FOCUS_ICONS, kindLabel, PlanPrefsEditor } from '@/components/plan/PlanPrefsEditor';
import { Icon, IconTile } from '@/components/ui/Icon';
import { MacroBar } from '@/components/ui/MacroRing';
import { MenuGroup, MenuRow } from '@/components/ui/Menu';
import { SheetProvider, useSheet } from '@/components/ui/Sheet';
import { Card, IconButton, PrimaryButton } from '@/components/ui/Surface';
import { Toast, useToast } from '@/components/ui/Toast';
import { Display, Mono, Sans } from '@/components/ui/Typography';
import { GroceryCard } from '@/components/widgets/FoodCards';
import { colors, radii } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import {
  dayChip,
  dayName,
  focusHints,
  focusLabels,
  planDayTotals,
  planGrocery,
  planMealKey,
  planTitle,
  recipeForMeal,
  servingsLabel,
  swapPlannedMeal,
} from '@/lib/mealplan';
import { joinList } from '@/lib/memory';
import { dayKey, formatKcal } from '@/lib/nutrition';
import { createMealPlan, reuseMealPlan } from '@/lib/plan';
import { useNouri } from '@/lib/store';
import type { MealPlan, PlanFocus, PlannedMeal } from '@/lib/types';
import { useSend } from '@/lib/useSend';

type When = 'today' | 'tomorrow' | 'week';

export default function MealPlanScreen() {
  return (
    <SheetProvider>
      <PlanContent />
    </SheetProvider>
  );
}

function PlanContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheet = useSheet();
  const send = useSend();
  const toast = useToast();
  const plan = useNouri((s) => s.plan);
  const planLog = useNouri((s) => s.planLog);
  const profile = useNouri((s) => s.profile);
  const memories = useNouri((s) => s.memories);
  const memoryOn = useNouri((s) => s.memoryOn);
  const pastPlans = useNouri((s) => s.pastPlans);
  const prefs = useNouri((s) => s.planPrefs);
  const today = dayKey();
  const current = plan && plan.days.some((d) => d.date >= today) ? plan : null;

  const [sel, setSel] = useState(0);
  useEffect(() => {
    const i = current?.days.findIndex((d) => d.date === today) ?? -1;
    setSel(Math.max(0, i));
  }, [current?.id, today]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile) return null;
  const T = profile.targets;

  const create = (when: When, focus: PlanFocus) => {
    const p = createMealPlan({
      kind: when === 'week' ? 'week' : 'day',
      focus,
      tomorrow: when === 'tomorrow',
    });
    if (p) {
      haptic.success();
      toast.show(when === 'week' ? 'Settimana pronta' : 'Piano pronto');
    }
  };

  const openBuilder = () =>
    sheet.open({
      title: 'Nuovo piano',
      subtitle: 'Sostituisce quello attuale',
      render: (close) => (
        <PlanBuilder onCreate={(when, focus) => close(() => create(when, focus))} compact />
      ),
    });

  const openPrefs = () =>
    sheet.open({
      title: 'Quando chiedi un piano',
      subtitle: 'Nouri usa queste scelte se non dici altro',
      render: () => <PlanPrefsEditor />,
    });

  const openPast = (p: MealPlan) =>
    sheet.open({
      title: planTitle(p),
      subtitle: `${focusLabels[p.focus]} · ${p.days.length === 1 ? '1 giorno' : `${p.days.length} giorni`} · ${new Set(p.days.flatMap((d) => d.meals.map((m) => m.title))).size} piatti`,
      render: (close) => (
        <View style={{ gap: 14 }}>
          <View style={styles.ingredients}>
            {p.days[0].meals.map((m, i) => (
              <View key={`${m.title}${i}`} style={styles.ingredient}>
                <Sans size={15}>{m.emoji}</Sans>
                <Sans size={14} style={{ flex: 1 }} numberOfLines={1}>
                  {m.title}
                </Sans>
                <Sans size={12} color={colors.faint}>
                  {m.label}
                </Sans>
              </View>
            ))}
            {p.days.length > 1 && (
              <Sans size={12} color={colors.faint} style={{ marginTop: 4 }}>
                Primo giorno di {p.days.length}
              </Sans>
            )}
          </View>
          <MenuGroup>
            <MenuRow
              icon="refresh-bold-duotone"
              tint="violet"
              label="Riusa da oggi"
              hint="Stessi piatti, il piano attuale finisce tra i salvati"
              onPress={() =>
                close(() => {
                  reuseMealPlan(p);
                  haptic.success();
                  toast.show('Piano rimesso in uso');
                })
              }
            />
            <MenuRow
              icon="trash-bin-trash-bold-duotone"
              label="Elimina dai piani salvati"
              danger
              onPress={() => close(() => useNouri.getState().removePastPlan(p.id))}
            />
          </MenuGroup>
        </View>
      ),
    });

  const ask = (text: string) => {
    router.back();
    setTimeout(() => send({ text }), 350);
  };

  const openMeal = (p: MealPlan, date: string, idx: number, m: PlannedMeal) => {
    const key = planMealKey(p.id, date, idx);
    const doneId = useNouri.getState().planLog[key];
    const recipe = recipeForMeal(m.title);
    sheet.open({
      title: m.title,
      subtitle: `${m.label} · ${formatKcal(m.kcal)} kcal · ${servingsLabel(m.servings)} · ${m.minutes} min`,
      render: (close) => (
        <View style={{ gap: 14 }}>
          {recipe ? (
            <View style={styles.ingredients}>
              <Sans size={12} weight="medium" color={colors.faint} style={{ marginBottom: 4 }}>
                {m.servings === 1
                  ? 'Ingredienti'
                  : `Ingredienti per 1 porzione · nel piano ${servingsLabel(m.servings)}`}
              </Sans>
              {recipe.ingredients.slice(0, 6).map((ing) => (
                <View key={ing} style={styles.ingredient}>
                  <View style={styles.bullet} />
                  <Sans size={14} style={{ flex: 1 }}>
                    {ing}
                  </Sans>
                </View>
              ))}
            </View>
          ) : null}
          <MenuGroup>
            {doneId ? (
              <MenuRow
                icon="check-circle-bold-duotone"
                tint="mint"
                label="Già nel diario"
                hint="Tocca per toglierlo"
                onPress={() => close(() => useNouri.getState().removeMeal(doneId))}
              />
            ) : (
              <MenuRow
                icon="check-circle-bold-duotone"
                tint="mint"
                label="L’ho mangiato"
                hint="Lo segno nel diario di oggi"
                onPress={() =>
                  close(() => {
                    const s = useNouri.getState();
                    const meal = s.logMeal(
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
                    s.markPlanMeal(key, meal.id);
                    haptic.success();
                    toast.show(`${m.label} nel diario`);
                  })
                }
              />
            )}
            <MenuRow
              icon="shuffle-bold-duotone"
              tint="violet"
              label="Cambia piatto"
              hint={`Un’altra idea per ${m.label.toLowerCase()}`}
              onPress={() =>
                close(() => {
                  const s = useNouri.getState();
                  if (!s.plan || !s.profile) return;
                  s.setPlan(
                    swapPlannedMeal(s.plan, date, idx, s.profile, s.memoryOn ? s.memories : [])
                  );
                  haptic.success();
                })
              }
            />
            <MenuRow
              icon="chef-hat-heart-bold-duotone"
              tint="amber"
              label="Ricetta completa"
              hint="Procedimento passo passo in chat"
              onPress={() => close(() => ask(`Ricetta: ${m.title}`))}
            />
          </MenuGroup>
        </View>
      ),
    });
  };

  const openGrocery = (p: MealPlan) =>
    sheet.open({
      title: 'Lista della spesa',
      subtitle:
        p.kind === 'week'
          ? 'Per tutta la settimana'
          : `Per ${dayName(p.days[0].date).toLowerCase()}`,
      render: () => (
        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          <GroceryCard sections={planGrocery(p)} widgetKey={`plan:${p.id}`} />
        </ScrollView>
      ),
    });

  const skipped = [
    ...profile.avoid,
    ...(memoryOn ? memories.filter((m) => m.kind === 'dislike').map((m) => m.text) : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
          gap: 20,
        }}>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Display size={28}>Piano pasti</Display>
            <Sans size={14} color={colors.faint}>
              {current ? planTitle(current) : 'Colazione, pranzo, spuntino e cena'}
            </Sans>
          </View>
          <IconButton label="Chiudi" onPress={() => router.back()} style={styles.close}>
            <Icon name="close-linear" size={20} />
          </IconButton>
        </View>

        {!current ? (
          <Animated.View entering={FadeIn}>
            <Card style={{ padding: 18, gap: 16 }}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <IconTile name="calendar-add-bold-duotone" tint="violet" size={56} />
                <Sans size={17} weight="semi" center>
                  Un piano su misura, in un tocco
                </Sans>
                <Sans size={14} color={colors.dim} center style={{ lineHeight: 20 }}>
                  Calibrato su {formatKcal(T.kcal)} kcal e {T.protein} g di proteine al giorno
                  {skipped.length ? `, senza ${joinList(skipped.map((s) => s.toLowerCase()))}` : ''}
                  .{plan ? ' Il piano precedente è finito.' : ''}
                </Sans>
              </View>
              <PlanBuilder onCreate={create} />
            </Card>
          </Animated.View>
        ) : (
          <PlanView
            plan={current}
            sel={sel}
            onSelect={setSel}
            planLog={planLog}
            targets={T}
            onMeal={(date, idx, m) => openMeal(current, date, idx, m)}
          />
        )}

        {current && (
          <MenuGroup
            footer={`Il piano segue il tuo profilo (${formatKcal(T.kcal)} kcal, ${T.protein} g di proteine)${
              skipped.length
                ? ` e lascia fuori ${joinList(skipped.map((s) => s.toLowerCase()))}`
                : ''
            }. Puoi chiederlo anche in chat: «fammi un piano per la settimana».`}>
            <MenuRow
              icon="cart-large-2-bold-duotone"
              tint="mint"
              label="Lista della spesa"
              chevron
              onPress={() => openGrocery(current)}
            />
            <MenuRow
              icon="shuffle-bold-duotone"
              tint="violet"
              label="Rigenera il piano"
              hint={`${focusLabels[current.focus]} · stessi giorni, piatti nuovi`}
              onPress={() => {
                const first = current.days[0].date;
                create(
                  current.kind === 'week' ? 'week' : first === today ? 'today' : 'tomorrow',
                  current.focus
                );
              }}
            />
            <MenuRow
              icon="calendar-add-bold-duotone"
              tint="blue"
              label="Nuovo piano"
              hint="Giorno o settimana, con un altro stile"
              chevron
              onPress={openBuilder}
            />
            <MenuRow
              icon="trash-bin-trash-bold-duotone"
              label="Elimina il piano"
              danger
              onPress={() => {
                useNouri.getState().setPlan(null);
                haptic.tap();
              }}
            />
          </MenuGroup>
        )}

        <MenuGroup footer="Se chiedi un piano senza dire per quanto, Nouri usa queste scelte.">
          <MenuRow
            icon="tuning-bold-duotone"
            tint="gray"
            label="Predefinito"
            value={`${kindLabel(prefs.kind)} · ${focusLabels[prefs.focus]}`}
            chevron
            onPress={openPrefs}
          />
        </MenuGroup>

        {pastPlans.length > 0 && (
          <MenuGroup
            title="Piani salvati"
            footer="Quando ne crei uno nuovo, il precedente resta qui. Puoi anche dire «riusa il piano precedente».">
            {pastPlans.map((p) => (
              <MenuRow
                key={p.id}
                icon="calendar-bold-duotone"
                tint="gray"
                label={planTitle(p)}
                hint={`${focusLabels[p.focus]} · ${p.days[0].meals
                  .map((m) => m.title.split(/,| con | e /)[0].toLowerCase())
                  .slice(0, 3)
                  .join(', ')}…`}
                chevron
                onPress={() => openPast(p)}
              />
            ))}
          </MenuGroup>
        )}
      </ScrollView>
      <Toast message={toast.message} bottom={insets.bottom + 24} />
    </View>
  );
}

function PlanView({
  plan,
  sel,
  onSelect,
  planLog,
  targets,
  onMeal,
}: {
  plan: MealPlan;
  sel: number;
  onSelect: (i: number) => void;
  planLog: Record<string, string>;
  targets: { kcal: number; protein: number; carbs: number; fat: number };
  onMeal: (date: string, idx: number, m: PlannedMeal) => void;
}) {
  const today = dayKey();
  const day = plan.days[sel] ?? plan.days[0];
  const tot = planDayTotals(day);
  const done = day.meals.filter((_, i) => planLog[planMealKey(plan.id, day.date, i)]).length;

  return (
    <View style={{ gap: 16 }}>
      {plan.days.length > 1 && (
        <View style={styles.days}>
          {plan.days.map((d, i) => {
            const c = dayChip(d.date);
            const on = i === sel;
            return (
              <Pressable
                key={d.date}
                onPress={() => {
                  haptic.select();
                  onSelect(i);
                }}
                style={[styles.day, on && styles.dayOn]}>
                <Sans size={11} color={on ? colors.onAccent : colors.faint}>
                  {d.date === today ? 'Oggi' : c.weekday}
                </Sans>
                <Mono size={16} weight="medium" color={on ? colors.onAccent : colors.ink}>
                  {c.day}
                </Mono>
              </Pressable>
            );
          })}
        </View>
      )}

      <Card style={{ padding: 16, gap: 14 }}>
        <View style={styles.summary}>
          <View>
            <Sans size={13} color={colors.faint}>
              {dayName(day.date)}
            </Sans>
            <Mono
              size={30}
              weight="medium"
              color={colors.ink}
              style={{ letterSpacing: -1, lineHeight: 36 }}>
              {formatKcal(tot.kcal)}
            </Mono>
            <Sans size={13} color={colors.faint}>
              kcal su {formatKcal(targets.kcal)}
            </Sans>
          </View>
          <View style={styles.progressPill}>
            <Icon
              name="check-circle-bold"
              size={15}
              color={done ? colors.positive : colors.faint}
            />
            <Sans size={13} weight="medium" color={done ? colors.positive : colors.faint}>
              {done}/{day.meals.length} nel diario
            </Sans>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          {[
            { l: 'Proteine', v: tot.protein, t: targets.protein, c: colors.protein },
            { l: 'Carboidrati', v: tot.carbs, t: targets.carbs, c: colors.carbs },
            { l: 'Grassi', v: tot.fat, t: targets.fat, c: colors.fat },
          ].map((m, i) => (
            <View key={m.l} style={{ flex: 1, gap: 5 }}>
              <Sans size={12} color={colors.faint}>
                {m.l}
              </Sans>
              <Mono size={14} weight="medium" color={colors.ink}>
                {Math.round(m.v)}
                <Mono size={12}> / {m.t} g</Mono>
              </Mono>
              <MacroBar progress={m.v / m.t} color={m.c} delay={120 + i * 80} />
            </View>
          ))}
        </View>
      </Card>

      <Card>
        {day.meals.map((m, i) => {
          const isDone = Boolean(planLog[planMealKey(plan.id, day.date, i)]);
          return (
            <Pressable
              key={`${day.date}${i}${m.title}`}
              accessibilityLabel={`Opzioni per ${m.title}`}
              onPress={() => {
                haptic.select();
                onMeal(day.date, i, m);
              }}
              style={({ pressed }) => [
                styles.meal,
                i > 0 && styles.divider,
                pressed && { backgroundColor: colors.bgSubtle },
              ]}>
              <View style={styles.emoji}>
                <Sans size={19}>{m.emoji}</Sans>
              </View>
              <View style={{ flex: 1 }}>
                <Sans size={12} color={colors.faint}>
                  {m.label} · {m.minutes}′
                  {m.servings !== 1 ? ` · ${servingsLabel(m.servings)}` : ''}
                </Sans>
                <Sans
                  size={15}
                  weight="medium"
                  numberOfLines={2}
                  color={isDone ? colors.faint : colors.ink}>
                  {m.title}
                </Sans>
                <Sans size={12} color={colors.faint}>
                  P {Math.round(m.protein)} · C {Math.round(m.carbs)} · G {Math.round(m.fat)}
                </Sans>
              </View>
              {isDone ? (
                <Icon name="check-circle-bold" size={20} color={colors.positive} />
              ) : (
                <Mono size={14} color={colors.ink}>
                  {formatKcal(m.kcal)}
                </Mono>
              )}
            </Pressable>
          );
        })}
      </Card>
    </View>
  );
}

function PlanBuilder({
  onCreate,
  compact,
}: {
  onCreate: (when: When, focus: PlanFocus) => void;
  compact?: boolean;
}) {
  const prefs = useNouri((s) => s.planPrefs);
  const [when, setWhen] = useState<When>(prefs.kind === 'week' ? 'week' : 'today');
  const [focus, setFocus] = useState<PlanFocus>(prefs.focus);
  const WHEN: { k: When; l: string }[] = [
    { k: 'today', l: 'Oggi' },
    { k: 'tomorrow', l: 'Domani' },
    { k: 'week', l: 'Settimana' },
  ];
  return (
    <View style={{ gap: 14 }}>
      <View style={styles.segment}>
        {WHEN.map((w) => (
          <Pressable
            key={w.k}
            onPress={() => {
              haptic.select();
              setWhen(w.k);
            }}
            style={[styles.segItem, when === w.k && styles.segOn]}>
            <Sans size={14} weight="medium" color={when === w.k ? colors.ink : colors.faint}>
              {w.l}
            </Sans>
          </Pressable>
        ))}
      </View>
      <MenuGroup title={compact ? undefined : 'Stile'}>
        {(Object.keys(focusLabels) as PlanFocus[]).map((f) => (
          <MenuRow
            key={f}
            icon={FOCUS_ICONS[f].icon}
            tint={FOCUS_ICONS[f].tint}
            label={focusLabels[f]}
            hint={focusHints[f]}
            checked={focus === f}
            onPress={() => setFocus(f)}
          />
        ))}
      </MenuGroup>
      <PrimaryButton
        label={when === 'week' ? 'Crea il piano della settimana' : 'Crea il piano'}
        onPress={() => onCreate(when, focus)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  close: { backgroundColor: colors.bgMuted },
  days: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  day: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.bgSubtle,
  },
  dayOn: { backgroundColor: colors.ink },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSubtle,
  },
  meal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  divider: { borderTopWidth: 1, borderColor: colors.border },
  emoji: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredients: { padding: 12, borderRadius: radii.md, backgroundColor: colors.bgSubtle },
  ingredient: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.faint },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.bgMuted,
  },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radii.pill },
  segOn: { backgroundColor: colors.bg, boxShadow: '0 1px 3px rgba(14,14,16,0.08)' },
});
