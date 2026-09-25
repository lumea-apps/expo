import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { MenuGroup, MenuRow } from '@/components/ui/Menu';
import { SheetProvider, useSheet, type CloseSheet } from '@/components/ui/Sheet';
import { Card, IconButton, PrimaryButton } from '@/components/ui/Surface';
import { Display, Mono, Sans } from '@/components/ui/Typography';
import {
  activityHints,
  activityIcons,
  dietHints,
  dietIcons,
  goalHints,
  goalIcons,
} from '@/constants/icons';
import { colors } from '@/constants/theme';
import { engineInfo } from '@/lib/ai';
import { haptic } from '@/lib/haptics';
import { AVOID_OPTIONS, activityLabels, dietLabels, formatKcal, goalLabels } from '@/lib/nutrition';
import { planTitle } from '@/lib/mealplan';
import { updatePlan } from '@/lib/plan';
import { useNouri } from '@/lib/store';
import type { Activity, Diet, Goal } from '@/lib/types';

export default function Profile() {
  return (
    <SheetProvider>
      <ProfileContent />
    </SheetProvider>
  );
}

function ProfileContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheet = useSheet();
  const profile = useNouri((s) => s.profile);
  const speakReplies = useNouri((s) => s.speakReplies);
  const setSpeakReplies = useNouri((s) => s.setSpeakReplies);
  const clearChat = useNouri((s) => s.clearChat);
  const seedDemoWeek = useNouri((s) => s.seedDemoWeek);
  const resetAll = useNouri((s) => s.resetAll);
  const memoryOn = useNouri((s) => s.memoryOn);
  const memories = useNouri((s) => s.memories);
  const shortcuts = useNouri((s) => s.shortcuts);
  const plan = useNouri((s) => s.plan);

  if (!profile) return null;
  const T = profile.targets;

  const pick = <K extends string>(
    title: string,
    keys: K[],
    current: K,
    label: (k: K) => string,
    hint: (k: K) => string,
    spec: (k: K) => (typeof goalIcons)[Goal],
    apply: (k: K) => void
  ) =>
    sheet.open({
      title,
      subtitle: 'Il piano si ricalcola da solo',
      render: (close) => (
        <MenuGroup>
          {keys.map((k) => (
            <MenuRow
              key={k}
              icon={spec(k).icon}
              tint={spec(k).tint}
              label={label(k)}
              hint={hint(k)}
              checked={k === current}
              onPress={() => close(() => apply(k))}
            />
          ))}
        </MenuGroup>
      ),
    });

  const editGoal = () =>
    pick(
      'Obiettivo',
      Object.keys(goalLabels) as Goal[],
      profile.goal,
      (k) => goalLabels[k],
      (k) => goalHints[k],
      (k) => goalIcons[k],
      (k) => updatePlan({ goal: k })
    );
  const editDiet = () =>
    pick(
      'Alimentazione',
      Object.keys(dietLabels) as Diet[],
      profile.diet,
      (k) => dietLabels[k],
      (k) => dietHints[k],
      (k) => dietIcons[k],
      (k) => updatePlan({ diet: k })
    );
  const editActivity = () =>
    pick(
      'Attività',
      ['low', 'medium', 'high'] as Activity[],
      profile.activity,
      (k) => activityLabels[k],
      (k) => activityHints[k],
      (k) => activityIcons[k],
      (k) => updatePlan({ activity: k })
    );
  const editAvoid = () =>
    sheet.open({
      title: 'Cosa eviti',
      subtitle: 'Idee e ricette ne terranno conto',
      render: (close) => <AvoidEditor current={profile.avoid} close={close} />,
    });
  const editWeight = () =>
    sheet.open({
      title: 'Peso',
      subtitle: 'Serve solo per calcolare il piano',
      render: (close) => <WeightEditor current={profile.weight ?? 70} close={close} />,
    });
  const confirm = (title: string, body: string, action: string, run: () => void) =>
    sheet.open({
      title,
      subtitle: body,
      render: (close) => (
        <View style={{ gap: 10 }}>
          <PrimaryButton
            label={action}
            style={{ backgroundColor: colors.rose }}
            onPress={() => close(run)}
          />
          <PrimaryButton label="Annulla" variant="outline" onPress={() => close()} />
        </View>
      ),
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSubtle }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 16,
          gap: 22,
        }}>
        <View style={styles.top}>
          <IconButton label="Chiudi" onPress={() => router.back()} style={styles.close}>
            <Icon name="close-linear" size={20} />
          </IconButton>
        </View>

        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={styles.avatar}>
            <Sans size={26} weight="semi">
              {profile.name.charAt(0).toUpperCase()}
            </Sans>
          </View>
          <Display size={26} center>
            {profile.name}
          </Display>
          <Sans size={14} color={colors.faint} center>
            {goalLabels[profile.goal]} · {dietLabels[profile.diet]}
          </Sans>
        </View>

        <Card style={{ padding: 16 }}>
          <View style={styles.targets}>
            <Target label="Calorie" value={formatKcal(T.kcal)} color={colors.ink} />
            <Target label="Proteine" value={`${T.protein} g`} color={colors.protein} />
            <Target label="Carbo" value={`${T.carbs} g`} color={colors.carbs} />
            <Target label="Grassi" value={`${T.fat} g`} color={colors.fat} />
          </View>
        </Card>

        <MenuGroup
          title="Il tuo piano"
          footer="Puoi anche dirlo a Nouri in chat: “voglio più proteine”, “sono diventato vegano”.">
          <MenuRow
            icon={goalIcons[profile.goal].icon}
            tint={goalIcons[profile.goal].tint}
            label="Obiettivo"
            value={goalLabels[profile.goal]}
            chevron
            onPress={editGoal}
          />
          <MenuRow
            icon={dietIcons[profile.diet].icon}
            tint={dietIcons[profile.diet].tint}
            label="Alimentazione"
            value={dietLabels[profile.diet]}
            chevron
            onPress={editDiet}
          />
          <MenuRow
            icon="forbidden-circle-bold-duotone"
            tint="rose"
            label="Evito"
            value={profile.avoid.length ? profile.avoid.join(', ') : 'Nulla'}
            chevron
            onPress={editAvoid}
          />
          <MenuRow
            icon="scale-bold-duotone"
            tint="blue"
            label="Peso"
            value={profile.weight ? `${profile.weight} kg` : 'Non indicato'}
            chevron
            onPress={editWeight}
          />
          <MenuRow
            icon={activityIcons[profile.activity].icon}
            tint={activityIcons[profile.activity].tint}
            label="Attività"
            value={activityLabels[profile.activity]}
            chevron
            onPress={editActivity}
          />
          <MenuRow
            icon="waterdrops-bold-duotone"
            tint="sky"
            label="Acqua"
            value={`${(T.water / 1000).toLocaleString('it-IT')} L al giorno`}
          />
        </MenuGroup>

        <MenuGroup
          title="Memoria e piano pasti"
          footer="Nouri ricorda i tuoi gusti e le scorciatoie, e prepara piani per il giorno o la settimana.">
          <MenuRow
            icon="brain-bold-duotone"
            tint="violet"
            label="Memoria"
            value={
              memoryOn
                ? `${memories.length} ${memories.length === 1 ? 'ricordo' : 'ricordi'}${shortcuts.length ? ` · ${shortcuts.length} scorc.` : ''}`
                : 'Spenta'
            }
            chevron
            onPress={() => router.push('/memory')}
          />
          <MenuRow
            icon="calendar-bold-duotone"
            tint="violet"
            label="Piano pasti"
            value={plan ? planTitle(plan) : 'Nessuno'}
            chevron
            onPress={() => router.push('/meal-plan')}
          />
        </MenuGroup>

        <MenuGroup
          title="Assistente"
          footer={
            engineInfo.id === 'local'
              ? 'Motore offline dimostrativo. Imposta EXPO_PUBLIC_NOURI_API_URL per usare Claude, con analisi reale delle foto.'
              : undefined
          }>
          <MenuRow
            icon="cpu-bolt-bold-duotone"
            tint="violet"
            label="Motore"
            value={engineInfo.id === 'claude' ? engineInfo.detail : engineInfo.label}
          />
          <MenuRow
            icon="volume-loud-bold-duotone"
            tint="violet"
            label="Leggi le risposte"
            right={
              <Switch
                value={speakReplies}
                onValueChange={(v) => {
                  haptic.select();
                  setSpeakReplies(v);
                }}
                trackColor={{ true: colors.ink, false: colors.bgMuted }}
                thumbColor={colors.bg}
                // react-native-web colours the "on" thumb with its own prop
                {...({ activeThumbColor: colors.bg } as object)}
              />
            }
          />
        </MenuGroup>

        <MenuGroup title="Dati">
          <MenuRow
            icon="magic-stick-3-bold-duotone"
            tint="amber"
            label="Riempi una settimana demo"
            chevron
            onPress={() => {
              seedDemoWeek();
              haptic.success();
            }}
          />
          <MenuRow
            icon="trash-bin-trash-bold-duotone"
            tint="gray"
            label="Cancella la conversazione"
            hint="Il diario resta"
            chevron
            onPress={() =>
              confirm(
                'Cancellare la conversazione?',
                'Il diario e il piano restano come sono.',
                'Cancella conversazione',
                clearChat
              )
            }
          />
          <MenuRow
            icon="restart-bold-duotone"
            label="Ricomincia da capo"
            danger
            onPress={() =>
              confirm(
                'Ricominciare da capo?',
                'Cancelliamo profilo, diario, memoria, piano pasti e conversazione.',
                'Ricomincia',
                () => {
                  resetAll();
                  router.replace('/onboarding');
                }
              )
            }
          />
        </MenuGroup>

        <Sans size={12} color={colors.faint} center>
          Nouri · icone Solar di 480 Design
        </Sans>
      </ScrollView>
    </View>
  );
}

function AvoidEditor({ current, close }: { current: string[]; close: CloseSheet }) {
  const [sel, setSel] = useState<string[]>(current);
  return (
    <View style={{ gap: 14 }}>
      <MenuGroup>
        {AVOID_OPTIONS.map((a) => (
          <MenuRow
            key={a}
            label={a}
            checked={sel.includes(a)}
            onPress={() => setSel((l) => (l.includes(a) ? l.filter((x) => x !== a) : [...l, a]))}
          />
        ))}
      </MenuGroup>
      <PrimaryButton
        label="Salva"
        onPress={() =>
          close(() =>
            updatePlan({
              avoidAdd: sel.filter((a) => !current.includes(a)),
              avoidRemove: current.filter((a) => !sel.includes(a)),
            })
          )
        }
      />
    </View>
  );
}

function WeightEditor({ current, close }: { current: number; close: CloseSheet }) {
  const [kg, setKg] = useState(current);
  const step = (d: number) => {
    haptic.select();
    setKg((v) => Math.min(200, Math.max(35, Math.round((v + d) * 2) / 2)));
  };
  return (
    <View style={{ gap: 18 }}>
      <View style={styles.stepper}>
        <Pressable
          accessibilityLabel="Meno mezzo chilo"
          onPress={() => step(-0.5)}
          style={styles.stepBtn}>
          <Icon name="minus-linear" size={22} />
        </Pressable>
        <View style={{ alignItems: 'center', minWidth: 140 }}>
          <Mono
            size={48}
            weight="medium"
            color={colors.ink}
            style={{ letterSpacing: -1.5, lineHeight: 56 }}>
            {kg.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </Mono>
          <Sans size={14} color={colors.faint}>
            kg
          </Sans>
        </View>
        <Pressable
          accessibilityLabel="Più mezzo chilo"
          onPress={() => step(0.5)}
          style={styles.stepBtn}>
          <Icon name="add-linear" size={22} />
        </Pressable>
      </View>
      <PrimaryButton label="Salva" onPress={() => close(() => updatePlan({ weight: kg }))} />
    </View>
  );
}

function Target({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: color }} />
      <Mono size={16} weight="medium" color={colors.ink}>
        {value}
      </Mono>
      <Sans size={12} color={colors.faint}>
        {label}
      </Sans>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  targets: { flexDirection: 'row', gap: 10 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
