import { useRouter } from 'expo-router';
import { ArrowRight, ArrowUp } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Rings } from '@/components/ui/MacroRing';
import { Orb, type OrbState } from '@/components/ui/Orb';
import { Aurora } from '@/components/ui/Aurora';
import { Chip, Glass, IconButton, PrimaryButton } from '@/components/ui/Surface';
import { Mono, Sans, Serif } from '@/components/ui/Typography';
import { colors, fonts } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import {
  AVOID_OPTIONS,
  activityLabels,
  computeTargets,
  dietLabels,
  formatKcal,
  goalLabels,
} from '@/lib/nutrition';
import { useNouri } from '@/lib/store';
import type { Activity, Diet, Goal } from '@/lib/types';
import { useAnimatedNumber } from '@/lib/useAnimatedNumber';

type Step = 'name' | 'goal' | 'diet' | 'avoid' | 'weight' | 'activity' | 'reveal';
const ORDER: Step[] = ['name', 'goal', 'diet', 'avoid', 'weight', 'activity', 'reveal'];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setProfile = useNouri((s) => s.setProfile);

  const [step, setStep] = useState<Step>('name');
  const [orb, setOrb] = useState<OrbState>('idle');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<Goal>('energy');
  const [diet, setDiet] = useState<Diet>('omnivore');
  const [avoid, setAvoid] = useState<string[]>([]);
  const [weight, setWeight] = useState('');
  const [activity, setActivity] = useState<Activity>('medium');

  const next = () => {
    haptic.soft();
    setOrb('thinking');
    setTimeout(() => {
      setStep((s) => ORDER[Math.min(ORDER.indexOf(s) + 1, ORDER.length - 1)]);
      setOrb('idle');
    }, 450);
  };

  const idx = ORDER.indexOf(step);
  const first = name.trim().split(' ')[0] || 'amico';
  const kg = Number(weight.replace(',', '.')) || null;
  const targets = computeTargets(goal, kg, activity);

  const finish = () => {
    haptic.success();
    setProfile({
      name: first,
      goal,
      diet,
      avoid,
      weight: kg,
      activity,
      targets,
      createdAt: new Date().toISOString(),
    });
    router.replace('/');
  };

  const QUESTIONS: Record<Step, [string, string, string?]> = {
    name: [
      'Ciao, sono ',
      'Nouri.',
      ' Parliamo di cibo come si parla con un amico. Come ti chiami?',
    ],
    goal: [`Piacere, ${first}. `, 'Cosa', ' vuoi ottenere mangiando meglio?'],
    diet: ['Come ', 'mangi', ' di solito?'],
    avoid: ['C’è qualcosa che ', 'eviti', '?'],
    weight: ['Quanto ', 'pesi', ', più o meno? Mi serve solo per i conti.'],
    activity: ['E quanto ti ', 'muovi', ' durante la settimana?'],
    reveal: ['', '', ''],
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Aurora preset="vivid" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 22,
          }}>
          <View style={styles.progress}>
            {ORDER.slice(0, -1).map((s, i) => (
              <View key={s} style={[styles.dash, i <= idx && { backgroundColor: colors.lime }]} />
            ))}
          </View>

          {step === 'reveal' ? (
            <Reveal name={first} targets={targets} onDone={finish} />
          ) : (
            <>
              <View style={{ alignItems: 'center', marginTop: 36, marginBottom: 36 }}>
                <Orb size={step === 'name' ? 170 : 120} state={orb} />
              </View>
              <Animated.View key={step} entering={FadeInDown.duration(500)} style={{ flex: 1 }}>
                <Mono upper size={11}>
                  {String(idx + 1).padStart(2, '0')} / {String(ORDER.length - 1).padStart(2, '0')}
                </Mono>
                <Serif size={38} style={{ marginTop: 10 }}>
                  {QUESTIONS[step][0]}
                  <Serif size={38} italic color={colors.lime}>
                    {QUESTIONS[step][1]}
                  </Serif>
                  {QUESTIONS[step][2]}
                </Serif>
              </Animated.View>

              <Animated.View
                key={`${step}-a`}
                entering={FadeInUp.delay(250).springify().damping(18)}
                style={{ gap: 14 }}>
                {step === 'name' && (
                  <InputBar
                    value={name}
                    onChange={setName}
                    placeholder="Il tuo nome"
                    onSubmit={() => name.trim() && next()}
                  />
                )}
                {step === 'goal' && (
                  <ChoiceGrid
                    options={Object.entries(goalLabels) as [Goal, string][]}
                    onPick={(v) => {
                      setGoal(v);
                      next();
                    }}
                  />
                )}
                {step === 'diet' && (
                  <ChoiceGrid
                    options={Object.entries(dietLabels) as [Diet, string][]}
                    onPick={(v) => {
                      setDiet(v);
                      next();
                    }}
                  />
                )}
                {step === 'avoid' && (
                  <>
                    <View style={styles.wrap}>
                      {AVOID_OPTIONS.map((a) => (
                        <Chip
                          key={a}
                          label={a}
                          active={avoid.includes(a)}
                          onPress={() =>
                            setAvoid((l) => (l.includes(a) ? l.filter((x) => x !== a) : [...l, a]))
                          }
                        />
                      ))}
                    </View>
                    <PrimaryButton
                      label={
                        avoid.length
                          ? `Evito ${avoid.length === 1 ? avoid[0].toLowerCase() : `${avoid.length} cose`}`
                          : 'Mangio di tutto'
                      }
                      icon={<ArrowRight size={18} color={colors.onAccent} />}
                      onPress={next}
                    />
                  </>
                )}
                {step === 'weight' && (
                  <>
                    <InputBar
                      value={weight}
                      onChange={setWeight}
                      placeholder="Es. 68"
                      suffix="kg"
                      numeric
                      onSubmit={next}
                    />
                    <Chip
                      label="Preferisco non dirlo"
                      onPress={() => {
                        setWeight('');
                        next();
                      }}
                      style={{ alignSelf: 'flex-start' }}
                    />
                  </>
                )}
                {step === 'activity' && (
                  <ChoiceGrid
                    options={[
                      ['low', `${activityLabels.low} · per lo più seduto`],
                      ['medium', `${activityLabels.medium} · 2–3 allenamenti`],
                      ['high', `${activityLabels.high} · sport quasi ogni giorno`],
                    ]}
                    column
                    onPick={(v) => {
                      setActivity(v as Activity);
                      next();
                    }}
                  />
                )}
              </Animated.View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function InputBar({
  value,
  onChange,
  placeholder,
  onSubmit,
  suffix,
  numeric,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onSubmit: () => void;
  suffix?: string;
  numeric?: boolean;
}) {
  return (
    <Glass radius={30} intensity={50} style={styles.inputBar}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        autoFocus={Platform.OS === 'web'}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        returnKeyType="next"
        onSubmitEditing={onSubmit}
        selectionColor={colors.lime}
        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
      />
      {suffix ? (
        <Mono size={14} color={colors.dim} style={{ marginRight: 8 }}>
          {suffix}
        </Mono>
      ) : null}
      <IconButton
        label="Continua"
        filled
        onPress={onSubmit}
        style={!value.trim() && { opacity: 0.35 }}>
        <ArrowUp size={20} color={colors.onAccent} strokeWidth={2.5} />
      </IconButton>
    </Glass>
  );
}

function ChoiceGrid<T extends string>({
  options,
  onPick,
  column,
}: {
  options: [T, string][];
  onPick: (v: T) => void;
  column?: boolean;
}) {
  const [picked, setPicked] = useState<T | null>(null);
  return (
    <View style={[styles.wrap, column && { flexDirection: 'column', alignItems: 'stretch' }]}>
      {options.map(([k, label]) => (
        <Chip
          key={k}
          label={label}
          active={picked === k}
          onPress={() => {
            setPicked(k);
            onPick(k);
          }}
          style={
            column
              ? { height: 52, justifyContent: 'flex-start', paddingHorizontal: 18 }
              : { height: 48, paddingHorizontal: 18 }
          }
        />
      ))}
    </View>
  );
}

function Reveal({
  name,
  targets,
  onDone,
}: {
  name: string;
  targets: ReturnType<typeof computeTargets>;
  onDone: () => void;
}) {
  const kcal = useAnimatedNumber(targets.kcal, 1600, 300);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1400);
    return () => clearTimeout(t);
  }, []);
  const macros = [
    {
      label: 'Proteine',
      v: targets.protein,
      c: colors.protein,
      share: (targets.protein * 4) / targets.kcal,
    },
    {
      label: 'Carbo',
      v: targets.carbs,
      c: colors.carbs,
      share: (targets.carbs * 4) / targets.kcal,
    },
    { label: 'Grassi', v: targets.fat, c: colors.fat, share: (targets.fat * 9) / targets.kcal },
  ];
  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View>
        <Animated.View
          entering={FadeIn.duration(800)}
          style={{ alignItems: 'center', marginTop: 28 }}>
          <Orb size={96} state="speaking" />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={{ marginTop: 28 }}>
          <Serif size={38}>
            Ecco il tuo{' '}
            <Serif size={38} italic color={colors.lime}>
              ritmo
            </Serif>
            , {name}.
          </Serif>
          <Sans size={15} color={colors.dim} style={{ marginTop: 8 }}>
            Un punto di partenza, non una gabbia. Lo aggiustiamo insieme, parlando.
          </Sans>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(400).duration(600)} style={{ marginTop: 26 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <Mono
              size={72}
              weight="medium"
              color={colors.ink}
              style={{ lineHeight: 78, letterSpacing: -3 }}>
              {formatKcal(kcal)}
            </Mono>
            <Mono size={13} style={{ marginBottom: 14 }}>
              KCAL / GIORNO
            </Mono>
          </View>
        </Animated.View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
          {macros.map((m, i) => (
            <Animated.View
              key={m.label}
              entering={FadeInUp.delay(700 + i * 150).springify()}
              style={{ flex: 1 }}>
              <Glass radius={22} style={{ padding: 14, alignItems: 'center', gap: 10 }}>
                <Rings
                  size={58}
                  stroke={6}
                  rings={[{ progress: m.share * 2, color: m.c }]}
                  delay={900 + i * 150}>
                  <Mono size={10} color={colors.ink}>
                    {Math.round(m.share * 100)}%
                  </Mono>
                </Rings>
                <View style={{ alignItems: 'center' }}>
                  <Mono size={18} weight="medium" color={colors.ink}>
                    {m.v}g
                  </Mono>
                  <Mono upper size={9}>
                    {m.label}
                  </Mono>
                </View>
              </Glass>
            </Animated.View>
          ))}
        </View>
        <Animated.View entering={FadeIn.delay(1300)} style={{ marginTop: 14 }}>
          <Mono size={11} center>
            + {(targets.water / 1000).toLocaleString('it-IT')} L D’ACQUA
          </Mono>
        </Animated.View>
      </View>
      {ready && (
        <Animated.View entering={FadeInUp.springify().damping(16)}>
          <PrimaryButton
            label="Iniziamo a parlare"
            icon={<ArrowRight size={18} color={colors.onAccent} />}
            onPress={onDone}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 6 },
  dash: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.ghost },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 6, paddingLeft: 18 },
  input: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
    height: 48,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 18,
  },
});
