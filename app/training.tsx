import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseDetail } from '@/components/training/ExerciseDetail';
import { SetupForm } from '@/components/training/SetupForm';
import { Icon, IconTile } from '@/components/ui/Icon';
import { MenuGroup, MenuRow } from '@/components/ui/Menu';
import { SheetProvider, useSheet } from '@/components/ui/Sheet';
import { Card, IconButton, PrimaryButton } from '@/components/ui/Surface';
import { Toast, useToast } from '@/components/ui/Toast';
import { Display, Mono, Sans } from '@/components/ui/Typography';
import { PATTERN_ICON } from '@/constants/trainingIcons';
import { colors, radii } from '@/constants/theme';
import { exerciseById } from '@/lib/exercises';
import { haptic } from '@/lib/haptics';
import { dayKey, formatKcal } from '@/lib/nutrition';
import { useNouri } from '@/lib/store';
import { createWorkoutPlan, logSession } from '@/lib/training';
import type { WorkoutPlan, WorkoutSession } from '@/lib/types';
import { useSend } from '@/lib/useSend';
import {
  doseLabel,
  exerciseCard,
  nextSession,
  sessionKcal,
  sessionOn,
  setupSummary,
  swapWorkoutExercise,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  weekStart,
} from '@/lib/workout';

const WEEK = [1, 2, 3, 4, 5, 6, 0];

const restLabel = (sec: number) =>
  sec >= 60 ? `${(sec / 60).toLocaleString('it-IT', { maximumFractionDigits: 1 })}′` : `${sec}″`;

export default function Training() {
  return (
    <SheetProvider>
      <TrainingContent />
    </SheetProvider>
  );
}

function TrainingContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheet = useSheet();
  const send = useSend();
  const toast = useToast();
  const training = useNouri((s) => s.training);
  const plan = useNouri((s) => s.workoutPlan);
  const log = useNouri((s) => s.workoutLog);
  const weight = useNouri((s) => s.profile?.weight ?? 70);

  const today = dayKey();
  const active = training.enabled && plan ? plan : null;
  const doneToday = (p: WorkoutPlan, s: WorkoutSession) =>
    log.find((l) => l.date === today && l.planId === p.id && l.sessionId === s.id);

  const weekLog = log.filter((l) => l.date >= weekStart());

  const ask = (text: string) => {
    router.back();
    setTimeout(() => send({ text }), 350);
  };

  const openExercise = (p: WorkoutPlan, session: WorkoutSession, index: number) => {
    const x = session.exercises[index];
    const e = exerciseById(x.id);
    sheet.open({
      render: (close) => (
        <View style={{ gap: 14 }}>
          {e ? (
            <ExerciseDetail card={exerciseCard(e, doseLabel(x))} maxHeight={470} />
          ) : (
            <Sans size={16} weight="semi">
              {x.name}
            </Sans>
          )}
          <MenuGroup>
            {e && (
              <MenuRow
                icon="shuffle-bold-duotone"
                tint="violet"
                label="Cambia esercizio"
                hint="Stesso movimento, con quello che hai"
                onPress={() =>
                  close(() => {
                    useNouri.getState().setWorkoutPlan(swapWorkoutExercise(p, session.id, index));
                    haptic.success();
                  })
                }
              />
            )}
            <MenuRow
              icon="chat-round-dots-bold-duotone"
              tint="gray"
              label="Chiedi a Nouri"
              hint="Dubbi, dolori, varianti"
              onPress={() => close(() => ask(`Spiegami: ${x.name}`))}
            />
          </MenuGroup>
        </View>
      ),
    });
  };

  const openSession = (p: WorkoutPlan, s: WorkoutSession) =>
    sheet.open({
      title: s.name,
      subtitle: `${WEEKDAY_LONG[s.weekday]} · ${s.minutes} min · ~${formatKcal(sessionKcal(s, weight))} kcal`,
      render: (close) => (
        <SessionSheet session={s} onExercise={(i) => close(() => openExercise(p, s, i))} />
      ),
    });

  const openSettings = () =>
    sheet.open({
      title: 'Impostazioni della scheda',
      subtitle: 'Cambiandole, la scheda si rifà',
      render: (close) => (
        <ScrollView style={{ maxHeight: 600 }} showsVerticalScrollIndicator={false}>
          <SetupForm
            initial={training.setup}
            cta="Rifai la scheda"
            onSubmit={(setup) =>
              close(() => {
                createWorkoutPlan(setup);
                toast.show('Scheda aggiornata');
              })
            }
          />
        </ScrollView>
      ),
    });

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
            <Display size={28}>Allenamento</Display>
            <Sans size={14} color={colors.faint}>
              {active ? setupSummary(active.setup) : 'Modulo opzionale'}
            </Sans>
          </View>
          <IconButton label="Chiudi" onPress={() => router.back()} style={styles.close}>
            <Icon name="close-linear" size={20} />
          </IconButton>
        </View>

        {!active ? (
          <>
            <Card style={{ padding: 18, gap: 8, alignItems: 'center' }}>
              <IconTile name="dumbbell-large-minimalistic-bold-duotone" tint="violet" size={56} />
              <Sans size={17} weight="semi" center>
                Una scheda su misura, se ti va
              </Sans>
              <Sans size={14} color={colors.dim} center style={{ lineHeight: 20 }}>
                Il modulo allenamento è facoltativo e separato dall’alimentazione. Dimmi obiettivo,
                dove ti alleni e quanto tempo hai: preparo la scheda della settimana, con ogni
                esercizio spiegato.
              </Sans>
            </Card>
            <SetupForm
              initial={training.setup}
              cta="Crea la mia scheda"
              onSubmit={(setup) => {
                createWorkoutPlan(setup);
                haptic.success();
                toast.show('Scheda pronta');
              }}
            />
            <MenuGroup>
              <MenuRow
                icon="magnifer-bold-duotone"
                tint="blue"
                label="Cerca esercizio"
                hint="Anche senza scheda: come si fa, errori, varianti"
                chevron
                onPress={() => router.push('/exercises')}
              />
            </MenuGroup>
          </>
        ) : (
          <>
            <View style={styles.week}>
              {WEEK.map((wd) => {
                const s = active.sessions.find((x) => x.weekday === wd);
                const isToday = new Date().getDay() === wd;
                return (
                  <View key={wd} style={[styles.day, isToday && styles.dayToday]}>
                    <Sans size={11} color={isToday ? colors.onAccent : colors.faint}>
                      {WEEKDAY_SHORT[wd]}
                    </Sans>
                    <Mono
                      size={15}
                      weight="medium"
                      color={isToday ? colors.onAccent : s ? colors.ink : colors.faint}>
                      {s ? s.id : '–'}
                    </Mono>
                  </View>
                );
              })}
            </View>

            <TodayCard
              plan={active}
              weight={weight}
              done={(s) => Boolean(doneToday(active, s))}
              onOpen={(s) => openSession(active, s)}
              onDone={(s) => {
                const existing = doneToday(active, s);
                if (existing) {
                  useNouri.getState().removeWorkoutLog(existing.id);
                  return;
                }
                logSession(active, s);
                toast.show(`${s.name}: fatto`);
              }}
            />

            <View>
              <Sans size={15} weight="semi" style={{ marginBottom: 10 }}>
                La scheda
              </Sans>
              <Card>
                {active.sessions.map((s, i) => (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      haptic.select();
                      openSession(active, s);
                    }}
                    style={({ pressed }) => [
                      styles.session,
                      i > 0 && styles.divider,
                      pressed && { backgroundColor: colors.bgSubtle },
                    ]}>
                    <View style={styles.letter}>
                      <Mono size={15} weight="medium" color={colors.ink}>
                        {s.id}
                      </Mono>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Sans size={15} weight="medium">
                        {s.name}
                      </Sans>
                      <Sans size={12} color={colors.faint} numberOfLines={1}>
                        {WEEKDAY_LONG[s.weekday]} · {s.minutes}′ · {s.focus}
                      </Sans>
                    </View>
                    {doneToday(active, s) ? (
                      <Icon name="check-circle-bold" size={20} color={colors.positive} />
                    ) : (
                      <Icon name="alt-arrow-right-linear" size={16} color={colors.faint} />
                    )}
                  </Pressable>
                ))}
              </Card>
            </View>

            <MenuGroup
              title="Questa settimana"
              footer="Le calorie sono una stima: il tuo piano alimentare tiene già conto di quanto ti muovi.">
              <MenuRow
                icon="medal-ribbon-star-bold-duotone"
                tint="amber"
                label="Allenamenti fatti"
                value={`${weekLog.length} di ${active.sessions.length}`}
              />
              <MenuRow
                icon="fire-bold-duotone"
                tint="rose"
                label="Calorie bruciate"
                value={`~${formatKcal(weekLog.reduce((a, l) => a + l.kcal, 0))} kcal`}
              />
            </MenuGroup>

            <MenuGroup>
              <MenuRow
                icon="magnifer-bold-duotone"
                tint="blue"
                label="Cerca esercizio"
                chevron
                onPress={() => router.push('/exercises')}
              />
              <MenuRow
                icon="tuning-bold-duotone"
                tint="gray"
                label="Impostazioni della scheda"
                hint={setupSummary(active.setup)}
                chevron
                onPress={openSettings}
              />
              <MenuRow
                icon="shuffle-bold-duotone"
                tint="violet"
                label="Rigenera la scheda"
                hint="Stesse impostazioni, esercizi nuovi"
                onPress={() => {
                  createWorkoutPlan(active.setup);
                  toast.show('Scheda rigenerata');
                }}
              />
              <MenuRow
                icon="close-circle-bold"
                label="Disattiva il modulo allenamento"
                hint="La scheda resta salvata"
                danger
                onPress={() => {
                  useNouri.getState().setTraining({ enabled: false });
                  haptic.tap();
                }}
              />
            </MenuGroup>
          </>
        )}
      </ScrollView>
      <Toast message={toast.message} bottom={insets.bottom + 24} />
    </View>
  );
}

function TodayCard({
  plan,
  weight,
  done,
  onOpen,
  onDone,
}: {
  plan: WorkoutPlan;
  weight: number;
  done: (s: WorkoutSession) => boolean;
  onOpen: (s: WorkoutSession) => void;
  onDone: (s: WorkoutSession) => void;
}) {
  const s = sessionOn(plan);
  if (!s) {
    const next = nextSession(plan, new Date(), true);
    return (
      <Card style={{ padding: 16, gap: 6 }}>
        <View style={styles.row}>
          <IconTile name="meditation-round-bold-duotone" tint="mint" size={40} />
          <View style={{ flex: 1 }}>
            <Sans size={13} color={colors.faint}>
              Oggi
            </Sans>
            <Sans size={16} weight="semi">
              Giorno di riposo
            </Sans>
          </View>
        </View>
        <Sans size={14} color={colors.dim} style={{ lineHeight: 20 }}>
          Il recupero fa parte dell’allenamento: una camminata va benissimo.
          {next ? ` Prossimo: ${next.session.name}, ${WEEKDAY_LONG[next.session.weekday]}.` : ''}
        </Sans>
      </Card>
    );
  }
  const isDone = done(s);
  return (
    <Card style={{ padding: 16, gap: 14 }}>
      <Pressable onPress={() => onOpen(s)} style={styles.row}>
        <IconTile name="dumbbell-large-minimalistic-bold-duotone" tint="violet" size={40} />
        <View style={{ flex: 1 }}>
          <Sans size={13} color={colors.faint}>
            Oggi · {s.minutes} min · ~{formatKcal(sessionKcal(s, weight))} kcal
          </Sans>
          <Sans size={16} weight="semi">
            {s.name}
          </Sans>
        </View>
        <Icon name="alt-arrow-right-linear" size={16} color={colors.faint} />
      </Pressable>
      <View style={{ gap: 6 }}>
        {s.exercises.map((x) => (
          <View key={x.id + x.name} style={styles.row}>
            <Sans size={14} style={{ flex: 1 }} numberOfLines={1}>
              {x.name}
            </Sans>
            <Mono size={13} color={colors.dim}>
              {doseLabel(x)}
            </Mono>
          </View>
        ))}
      </View>
      <PrimaryButton
        label={isDone ? 'Fatto · tocca per annullare' : 'Segna come fatto'}
        variant={isDone ? 'outline' : 'solid'}
        icon={
          isDone ? <Icon name="check-circle-bold" size={18} color={colors.positive} /> : undefined
        }
        style={{ height: 46 }}
        onPress={() => onDone(s)}
      />
    </Card>
  );
}

function SessionSheet({
  session,
  onExercise,
}: {
  session: WorkoutSession;
  onExercise: (index: number) => void;
}) {
  // follows swaps made while the sheet is open
  const current =
    useNouri((s) => s.workoutPlan?.sessions.find((x) => x.id === session.id)) ?? session;
  return (
    <ScrollView style={{ maxHeight: 560 }} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 12 }}>
        <View style={styles.warmup}>
          <Icon name="running-bold-duotone" size={18} color={colors.dim} />
          <Sans size={13} color={colors.dim} style={{ flex: 1, lineHeight: 19 }}>
            Riscaldamento: 5 minuti di camminata o jumping jack leggeri, poi rotazioni di spalle e
            anche.
          </Sans>
        </View>
        <MenuGroup footer="Tocca un esercizio per la spiegazione o per cambiarlo.">
          {current.exercises.map((x, i) => {
            const e = exerciseById(x.id);
            const ic = e ? PATTERN_ICON[e.pattern] : PATTERN_ICON.core;
            return (
              <MenuRow
                key={`${x.id}${i}`}
                icon={ic.icon}
                tint={ic.tint}
                label={x.name}
                hint={`${doseLabel(x)}${x.rest ? ` · recupero ${restLabel(x.rest)}` : ''}${x.note ? ` · ${x.note}` : ''}`}
                chevron
                onPress={() => onExercise(i)}
              />
            );
          })}
        </MenuGroup>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  close: { backgroundColor: colors.bgMuted },
  week: { flexDirection: 'row', gap: 4 },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.bgSubtle,
  },
  dayToday: { backgroundColor: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  session: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  divider: { borderTopWidth: 1, borderColor: colors.border },
  letter: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warmup: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.bgSubtle,
  },
});
