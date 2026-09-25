import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ExerciseDetail } from '@/components/training/ExerciseDetail';
import { Icon, IconTile } from '@/components/ui/Icon';
import { useSheet } from '@/components/ui/Sheet';
import { Card, PrimaryButton } from '@/components/ui/Surface';
import { Mono, Sans } from '@/components/ui/Typography';
import { PATTERN_ICON } from '@/constants/trainingIcons';
import { colors, radii, tints } from '@/constants/theme';
import { exerciseById, LEVEL_LABELS } from '@/lib/exercises';
import { haptic } from '@/lib/haptics';
import { dayKey, formatKcal } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';
import { logSession } from '@/lib/training';
import type { ExerciseCard, WorkoutPlan } from '@/lib/types';
import {
  doseLabel,
  exerciseCard,
  nextSession,
  sessionKcal,
  setupSummary,
  WEEKDAY_SHORT,
} from '@/lib/workout';

const iconOf = (id: string) => {
  const e = exerciseById(id);
  return e ? PATTERN_ICON[e.pattern] : PATTERN_ICON.core;
};

/** A weekly routine in chat: pick a session, tap an exercise to learn how it's done. */
export function WorkoutPlanCard({
  plan,
  sessionId,
  onSend,
}: {
  plan: WorkoutPlan;
  sessionId?: string;
  onSend: (text: string) => void;
}) {
  const router = useRouter();
  const active = useNouri((s) => (s.training.enabled ? s.workoutPlan : null));
  const log = useNouri((s) => s.workoutLog);
  const weight = useNouri((s) => s.profile?.weight ?? 70);
  const activate = useNouri((s) => s.activateWorkoutPlan);
  const [sel, setSel] = useState(() => {
    const byId = plan.sessions.findIndex((s) => s.id === sessionId);
    if (byId >= 0) return byId;
    const next = nextSession(plan);
    return Math.max(
      0,
      plan.sessions.findIndex((s) => s.id === next?.session.id)
    );
  });
  const session = plan.sessions[sel] ?? plan.sessions[0];
  if (!session) return null;

  const today = dayKey();
  const isActive = active?.id === plan.id;
  const isToday = session.weekday === new Date().getDay();
  const done = log.some(
    (l) => l.date === today && l.planId === plan.id && l.sessionId === session.id
  );

  return (
    <Card>
      <View style={styles.head}>
        <IconTile name="dumbbells-2-bold-duotone" tint="mint" size={34} />
        <View style={{ flex: 1 }}>
          <Sans size={12} color={colors.faint}>
            Scheda di allenamento{isActive ? ' · attiva' : ''}
          </Sans>
          <Sans size={15} weight="semi" numberOfLines={2}>
            {setupSummary(plan.setup)}
          </Sans>
        </View>
      </View>

      {plan.sessions.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}
          style={{ marginTop: 14 }}>
          {plan.sessions.map((s, i) => {
            const on = i === sel;
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  haptic.select();
                  setSel(i);
                }}
                style={[styles.tab, on && styles.tabOn]}>
                <Sans size={11} color={on ? colors.onAccent : colors.faint}>
                  {s.weekday === new Date().getDay() ? 'Oggi' : WEEKDAY_SHORT[s.weekday]}
                </Sans>
                <Mono size={15} weight="medium" color={on ? colors.onAccent : colors.ink}>
                  {s.id}
                </Mono>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.sessionHead}>
        <Sans size={14} weight="semi">
          {session.name}
        </Sans>
        <Sans size={12} color={colors.faint}>
          {session.focus} · {session.minutes} min · ~{formatKcal(sessionKcal(session, weight))} kcal
        </Sans>
      </View>

      <View style={styles.list}>
        {session.exercises.map((x, i) => {
          const ic = iconOf(x.id);
          return (
            <Pressable
              key={`${session.id}${i}`}
              onPress={() => {
                haptic.select();
                onSend(`Spiegami: ${x.name}`);
              }}
              style={({ pressed }) => [
                styles.row,
                i > 0 && styles.divider,
                pressed && { backgroundColor: colors.bgSubtle },
              ]}>
              <IconTile name={ic.icon} tint={ic.tint} size={32} />
              <Sans size={14} weight="medium" numberOfLines={2} style={{ flex: 1 }}>
                {x.name}
              </Sans>
              <Mono size={13} color={colors.ink}>
                {doseLabel(x)}
              </Mono>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        {isActive ? (
          <>
            <PrimaryButton
              label="Apri la scheda"
              variant="outline"
              style={{ flex: 1, height: 44 }}
              onPress={() => router.push('/training')}
            />
            {isToday && (
              <PrimaryButton
                label={done ? 'Fatto' : 'Segna fatto'}
                variant={done ? 'outline' : 'solid'}
                style={{ height: 44 }}
                icon={
                  done ? (
                    <Icon name="check-circle-bold" size={18} color={colors.positive} />
                  ) : undefined
                }
                onPress={() => {
                  if (done) return;
                  logSession(plan, session);
                }}
              />
            )}
          </>
        ) : (
          <PrimaryButton
            label="Usa questa scheda"
            variant="outline"
            style={{ flex: 1, height: 44 }}
            onPress={() => {
              activate(plan);
              haptic.success();
            }}
          />
        )}
      </View>
    </Card>
  );
}

/** How to do one exercise, compact: muscles, the steps, one tip and one mistake. */
export function ExerciseCardView({
  exercise,
  onSend,
}: {
  exercise: ExerciseCard;
  onSend: (text: string) => void;
}) {
  const sheet = useSheet();
  const e = exerciseById(exercise.id);
  const ic = iconOf(exercise.id);
  const easier = e?.easier ? exerciseById(e.easier) : undefined;
  const harder = e?.harder ? exerciseById(e.harder) : undefined;
  const meta = [
    exercise.equipment.join(' + '),
    exercise.level ? LEVEL_LABELS[exercise.level as 1 | 2 | 3] : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const openAll = () =>
    sheet.open({
      render: () => <ExerciseDetail card={exercise} maxHeight={600} />,
    });

  return (
    <Card>
      <View style={styles.head}>
        <IconTile name={ic.icon} tint={ic.tint} size={40} />
        <View style={{ flex: 1 }}>
          <Sans size={16} weight="semi">
            {exercise.name}
          </Sans>
          {meta ? (
            <Sans size={12} color={colors.faint}>
              {meta}
            </Sans>
          ) : null}
        </View>
      </View>

      <View style={styles.tags}>
        {exercise.muscles.map((m, i) => (
          <View key={m} style={[styles.tag, i === 0 && styles.tagMain]}>
            <Sans size={12} weight="medium" color={i === 0 ? colors.onAccent : colors.dim}>
              {m}
            </Sans>
          </View>
        ))}
        {exercise.dose ? (
          <View style={[styles.tag, styles.tagOutline]}>
            <Mono size={12} weight="medium">
              {exercise.dose}
            </Mono>
          </View>
        ) : null}
      </View>

      <View style={styles.steps}>
        {exercise.steps.map((s, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.num}>
              <Mono size={11} weight="medium">
                {i + 1}
              </Mono>
            </View>
            <Sans size={14} style={{ flex: 1, lineHeight: 20 }}>
              {s}
            </Sans>
          </View>
        ))}
      </View>

      {(exercise.tips[0] || exercise.mistakes[0]) && (
        <View style={styles.notes}>
          {exercise.tips[0] ? (
            <View style={styles.note}>
              <Icon name="lightbulb-bolt-bold-duotone" size={16} color={tints.amber.fg} />
              <Sans size={13} color={colors.dim} style={{ flex: 1, lineHeight: 19 }}>
                {exercise.tips[0]}
              </Sans>
            </View>
          ) : null}
          {exercise.mistakes[0] ? (
            <View style={styles.note}>
              <Icon name="danger-triangle-bold-duotone" size={16} color={colors.rose} />
              <Sans size={13} color={colors.dim} style={{ flex: 1, lineHeight: 19 }}>
                {exercise.mistakes[0]}
              </Sans>
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.footer}>
        <PrimaryButton
          label="Tutti i dettagli"
          variant="outline"
          style={{ flex: 1, height: 44 }}
          onPress={openAll}
        />
        {(easier ?? harder) && (
          <PrimaryButton
            label={easier ? 'Più facile' : 'Più difficile'}
            variant="outline"
            style={{ height: 44 }}
            onPress={() =>
              onSend(`${easier ? 'Più facile' : 'Più difficile'}: ${(easier ?? harder)!.name}`)
            }
          />
        )}
      </View>
    </Card>
  );
}

/** A short list of exercises (by muscle group or search): tap one for the explanation. */
export function ExercisesList({
  title,
  items,
}: {
  title: string;
  items: { id: string; name: string; muscles: string[] }[];
}) {
  const sheet = useSheet();
  const open = (id: string) => {
    const e = exerciseById(id);
    if (!e) return;
    haptic.select();
    sheet.open({ render: () => <ExerciseDetail card={exerciseCard(e)} maxHeight={600} /> });
  };

  return (
    <Card>
      <View style={[styles.head, { paddingBottom: 12 }]}>
        <IconTile name="dumbbell-small-bold-duotone" tint="mint" size={34} />
        <Sans size={15} weight="semi" style={{ flex: 1 }}>
          {title}
        </Sans>
      </View>
      <View style={[styles.list, { marginTop: 0 }]}>
        {items.map((x, i) => {
          const ic = iconOf(x.id);
          const e = exerciseById(x.id);
          return (
            <Pressable
              key={x.id || x.name}
              onPress={() => open(x.id)}
              style={({ pressed }) => [
                styles.row,
                i > 0 && styles.divider,
                pressed && { backgroundColor: colors.bgSubtle },
              ]}>
              <IconTile name={ic.icon} tint={ic.tint} size={32} />
              <View style={{ flex: 1 }}>
                <Sans size={14} weight="medium" numberOfLines={1}>
                  {x.name}
                </Sans>
                <Sans size={12} color={colors.faint} numberOfLines={1}>
                  {[x.muscles.slice(0, 2).join(', '), e ? LEVEL_LABELS[e.level] : '']
                    .filter(Boolean)
                    .join(' · ')}
                </Sans>
              </View>
              <Icon name="alt-arrow-right-linear" size={16} color={colors.faint} />
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 0 },
  tab: {
    width: 46,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.bgSubtle,
  },
  tabOn: { backgroundColor: colors.ink },
  sessionHead: { gap: 2, paddingHorizontal: 16, paddingTop: 14 },
  list: { marginTop: 12, borderTopWidth: 1, borderColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  divider: { borderTopWidth: 1, borderColor: colors.border },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingTop: 12 },
  tag: {
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    backgroundColor: colors.bgMuted,
  },
  tagMain: { backgroundColor: colors.ink },
  tagOutline: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  steps: { paddingHorizontal: 16, paddingTop: 14 },
  step: { flexDirection: 'row', gap: 10, marginBottom: 9 },
  num: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  notes: {
    gap: 8,
    marginHorizontal: 16,
    marginTop: 2,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.bgSubtle,
  },
  note: { flexDirection: 'row', gap: 8 },
  footer: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
});
