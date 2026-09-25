import { useRouter } from 'expo-router';
import { ArrowUp, Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MacroBar } from '@/components/ui/MacroRing';
import { Orb, type OrbState } from '@/components/ui/Orb';
import { Chip, IconButton, PrimaryButton } from '@/components/ui/Surface';
import { Display, Mono, Sans } from '@/components/ui/Typography';
import { colors, fonts, radii } from '@/constants/theme';
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
    }, 380);
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

  // [primary sentence, grey follow-up]
  const QUESTIONS: Record<Exclude<Step, 'reveal'>, [string, string]> = {
    name: ['Ciao, sono Nouri.', 'Come ti chiami?'],
    goal: [`Piacere, ${first}.`, 'Cosa vuoi ottenere?'],
    diet: ['Come mangi', 'di solito?'],
    avoid: ['C’è qualcosa', 'che eviti?'],
    weight: ['Quanto pesi, più o meno?', 'Serve solo per i conti.'],
    activity: ['Quanto ti muovi', 'durante la settimana?'],
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 20,
          }}>
          <View style={styles.progress}>
            {ORDER.slice(0, -1).map((s, i) => (
              <View key={s} style={[styles.dash, i <= idx && { backgroundColor: colors.ink }]} />
            ))}
          </View>

          {step === 'reveal' ? (
            <Reveal name={first} targets={targets} onDone={finish} />
          ) : (
            <>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Orb size={step === 'name' ? 132 : 104} state={orb} />
                <Animated.View
                  key={step}
                  entering={FadeInDown.duration(420)}
                  style={{ marginTop: 36, alignSelf: 'stretch' }}>
                  <Display size={28} center>
                    {QUESTIONS[step][0]}
                  </Display>
                  <Display size={28} muted center>
                    {QUESTIONS[step][1]}
                  </Display>
                </Animated.View>
              </View>

              <Animated.View
                key={`${step}-a`}
                entering={FadeInDown.delay(180).duration(420)}
                style={{ gap: 12 }}>
                {step === 'name' && (
                  <InputBar
                    value={name}
                    onChange={setName}
                    placeholder="Il tuo nome"
                    onSubmit={() => name.trim() && next()}
                  />
                )}
                {step === 'goal' && (
                  <ChoiceList
                    options={Object.entries(goalLabels) as [Goal, string][]}
                    onPick={(v) => {
                      setGoal(v);
                      next();
                    }}
                  />
                )}
                {step === 'diet' && (
                  <ChoiceList
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
                          style={{ height: 40 }}
                        />
                      ))}
                    </View>
                    <PrimaryButton
                      label={avoid.length ? 'Continua' : 'Mangio di tutto'}
                      onPress={next}
                      style={{ marginTop: 8 }}
                    />
                  </>
                )}
                {step === 'weight' && (
                  <>
                    <InputBar
                      value={weight}
                      onChange={setWeight}
                      placeholder="68"
                      suffix="kg"
                      numeric
                      onSubmit={next}
                    />
                    <PrimaryButton
                      label="Preferisco non dirlo"
                      variant="outline"
                      onPress={() => {
                        setWeight('');
                        next();
                      }}
                    />
                  </>
                )}
                {step === 'activity' && (
                  <ChoiceList
                    options={[
                      ['low', `${activityLabels.low}, per lo più seduto`],
                      ['medium', `${activityLabels.medium}, 2–3 allenamenti`],
                      ['high', `${activityLabels.high}, sport quasi ogni giorno`],
                    ]}
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
    <View style={styles.inputBar}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        autoFocus={Platform.OS === 'web'}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        returnKeyType="next"
        onSubmitEditing={onSubmit}
        selectionColor={colors.ink}
        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
      />
      {suffix ? (
        <Sans size={16} color={colors.faint} style={{ marginRight: 10 }}>
          {suffix}
        </Sans>
      ) : null}
      <IconButton label="Continua" filled size={38} disabled={!value.trim()} onPress={onSubmit}>
        <ArrowUp
          size={18}
          color={value.trim() ? colors.onAccent : colors.faint}
          strokeWidth={2.4}
        />
      </IconButton>
    </View>
  );
}

function ChoiceList<T extends string>({
  options,
  onPick,
}: {
  options: [T, string][];
  onPick: (v: T) => void;
}) {
  const [picked, setPicked] = useState<T | null>(null);
  return (
    <View style={styles.list}>
      {options.map(([k, label], i) => (
        <Pressable
          key={k}
          onPress={() => {
            haptic.select();
            setPicked(k);
            onPick(k);
          }}
          style={({ pressed }) => [
            styles.option,
            i > 0 && styles.optionDivider,
            (pressed || picked === k) && { backgroundColor: colors.bgSubtle },
          ]}>
          <Sans size={16} weight="medium">
            {label}
          </Sans>
          {picked === k && <Check size={18} color={colors.ink} strokeWidth={2.2} />}
        </Pressable>
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
  const kcal = useAnimatedNumber(targets.kcal, 1400, 250);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1100);
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
      label: 'Carboidrati',
      v: targets.carbs,
      c: colors.carbs,
      share: (targets.carbs * 4) / targets.kcal,
    },
    { label: 'Grassi', v: targets.fat, c: colors.fat, share: (targets.fat * 9) / targets.kcal },
  ];
  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center' }}>
          <Orb size={88} state="speaking" />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(150).duration(500)} style={{ marginTop: 32 }}>
          <Display size={28} center>
            Ecco il tuo piano, {name}.
          </Display>
          <Display size={28} muted center>
            Lo aggiustiamo parlando.
          </Display>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.bigNumber}>
          <Mono
            size={60}
            weight="medium"
            color={colors.ink}
            style={{ lineHeight: 66, letterSpacing: -2.5 }}>
            {formatKcal(kcal)}
          </Mono>
          <Sans size={14} color={colors.faint}>
            kcal al giorno · {(targets.water / 1000).toLocaleString('it-IT')} L d’acqua
          </Sans>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(450).duration(500)} style={styles.macroCard}>
          {macros.map((m, i) => (
            <View key={m.label} style={{ flex: 1, gap: 8 }}>
              <Sans size={12} color={colors.faint}>
                {m.label}
              </Sans>
              <Mono size={18} weight="medium" color={colors.ink}>
                {m.v} g
              </Mono>
              <MacroBar progress={m.share * 2} color={m.c} delay={700 + i * 120} />
            </View>
          ))}
        </Animated.View>
      </View>
      {ready && (
        <Animated.View entering={FadeIn.duration(300)}>
          <PrimaryButton label="Inizia" onPress={onDone} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 4 },
  dash: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.ghost },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingLeft: 18,
    paddingRight: 8,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
    height: 48,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 17,
  },
  list: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  option: {
    height: 54,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
  },
  optionDivider: { borderTopWidth: 1, borderColor: colors.border },
  bigNumber: { alignItems: 'center', marginTop: 34, gap: 2 },
  macroCard: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 28,
    padding: 16,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
