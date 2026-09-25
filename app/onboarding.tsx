import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

import { Icon, IconTile, type IconName } from '@/components/ui/Icon';
import { MacroBar } from '@/components/ui/MacroRing';
import { Orb, type OrbState } from '@/components/ui/Orb';
import { Chip, IconButton, PrimaryButton } from '@/components/ui/Surface';
import { Display, Mono, Sans } from '@/components/ui/Typography';
import {
  activityHints,
  activityIcons,
  dietHints,
  dietIcons,
  goalHints,
  goalIcons,
  type IconSpec,
} from '@/constants/icons';
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
import type { Activity, Diet, Goal, OnboardingDraft } from '@/lib/types';
import { useAnimatedNumber } from '@/lib/useAnimatedNumber';

type Step = 'name' | 'goal' | 'diet' | 'avoid' | 'weight' | 'activity' | 'reveal';
const ORDER: Step[] = ['name', 'goal', 'diet', 'avoid', 'weight', 'activity', 'reveal'];

/**
 * Onboarding happens once. Once it's done the screen sends you to the chat
 * (even when opened directly); if it's interrupted, it resumes from the
 * last answer.
 */
export default function Onboarding() {
  const hydrated = useNouri((s) => s.hydrated);
  const profile = useNouri((s) => s.profile);
  // decided once, when the stored state is known: finishing it here must not bounce away
  const doneBefore = useRef<boolean | null>(null);
  if (hydrated && doneBefore.current === null) doneBefore.current = Boolean(profile);

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (doneBefore.current) return <Redirect href="/" />;
  return <OnboardingFlow draft={useNouri.getState().onboardingDraft} />;
}

function OnboardingFlow({ draft }: { draft: OnboardingDraft | null }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setProfile = useNouri((s) => s.setProfile);
  const setDraft = useNouri((s) => s.setOnboardingDraft);

  const [step, setStep] = useState<Step>(draft?.step ?? 'name');
  const [orb, setOrb] = useState<OrbState>('idle');
  const [name, setName] = useState(draft?.name ?? '');
  const [goal, setGoal] = useState<Goal>(draft?.goal ?? 'energy');
  const [diet, setDiet] = useState<Diet>(draft?.diet ?? 'omnivore');
  const [avoid, setAvoid] = useState<string[]>(draft?.avoid ?? []);
  const [weight, setWeight] = useState(draft?.weight ?? '');
  const [activity, setActivity] = useState<Activity>(draft?.activity ?? 'medium');

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

  // every answer is kept, so closing the app mid-way doesn't start over
  useEffect(() => {
    if (step !== 'reveal') setDraft({ step, name, goal, diet, avoid, weight, activity });
  }, [step, name, goal, diet, avoid, weight, activity, setDraft]);

  // the profile is saved as soon as the plan is revealed: onboarding is done from here
  const saved = useRef(false);
  useEffect(() => {
    if (step !== 'reveal' || saved.current) return;
    saved.current = true;
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
  }, [step, first, goal, diet, avoid, kg, activity, targets, setProfile]);

  const finish = () => {
    haptic.success();
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
                    options={(Object.keys(goalLabels) as Goal[]).map((k) => ({
                      key: k,
                      label: goalLabels[k],
                      hint: goalHints[k],
                      ...goalIcons[k],
                    }))}
                    onPick={(v) => {
                      setGoal(v);
                      next();
                    }}
                  />
                )}
                {step === 'diet' && (
                  <ChoiceList
                    options={(Object.keys(dietLabels) as Diet[]).map((k) => ({
                      key: k,
                      label: dietLabels[k],
                      hint: dietHints[k],
                      ...dietIcons[k],
                    }))}
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
                    options={(['low', 'medium', 'high'] as Activity[]).map((k) => ({
                      key: k,
                      label: activityLabels[k],
                      hint: activityHints[k],
                      ...activityIcons[k],
                    }))}
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
        <Icon
          name="arrow-up-linear"
          size={20}
          color={value.trim() ? colors.onAccent : colors.faint}
        />
      </IconButton>
    </View>
  );
}

function ChoiceList<T extends string>({
  options,
  onPick,
}: {
  options: ({ key: T; label: string; hint: string } & IconSpec)[];
  onPick: (v: T) => void;
}) {
  const [picked, setPicked] = useState<T | null>(null);
  return (
    <View style={styles.list}>
      {options.map((o, i) => (
        <Pressable
          key={o.key}
          onPress={() => {
            haptic.select();
            setPicked(o.key);
            onPick(o.key);
          }}
          style={({ pressed }) => [
            styles.option,
            i > 0 && styles.optionDivider,
            (pressed || picked === o.key) && { backgroundColor: colors.bgSubtle },
          ]}>
          <IconTile name={o.icon as IconName} tint={o.tint} size={38} />
          <View style={{ flex: 1 }}>
            <Sans size={16} weight="medium">
              {o.label}
            </Sans>
            <Sans size={13} color={colors.faint}>
              {o.hint}
            </Sans>
          </View>
          {picked === o.key ? (
            <Icon name="check-circle-bold" size={22} color={colors.ink} />
          ) : (
            <Icon name="alt-arrow-right-linear" size={16} color={colors.faint} />
          )}
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
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  optionDivider: { borderTopWidth: 1, borderColor: colors.border, marginLeft: 0 },
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
