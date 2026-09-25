import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShortcutEditor } from '@/components/memory/ShortcutEditor';
import { kindLabel, PlanPrefsEditor } from '@/components/plan/PlanPrefsEditor';
import { activityIcons, dietIcons, goalIcons } from '@/constants/icons';
import { Icon, IconTile, type IconName } from '@/components/ui/Icon';
import { MenuGroup, MenuRow } from '@/components/ui/Menu';
import { SheetProvider, useSheet, type CloseSheet } from '@/components/ui/Sheet';
import { IconButton, PrimaryButton } from '@/components/ui/Surface';
import { Toast, useToast } from '@/components/ui/Toast';
import { Display, Sans } from '@/components/ui/Typography';
import { colors, fonts, radii, type Tint } from '@/constants/theme';
import { GOAL_ICON } from '@/constants/trainingIcons';
import { haptic } from '@/lib/haptics';
import { focusLabels, planTitle } from '@/lib/mealplan';
import {
  activityLabels,
  dayKey,
  dietLabels,
  formatKcal,
  formatTime,
  goalLabels,
  mealTotals,
} from '@/lib/nutrition';
import { logShortcut } from '@/lib/shortcuts';
import { useNouri } from '@/lib/store';
import { GOAL_LABELS, weekStart } from '@/lib/workout';
import type { Meal, MealDraft, MemoryKind, MemoryNote, Shortcut } from '@/lib/types';

const GROUPS: {
  kind: MemoryKind;
  title: string;
  icon: IconName;
  tint: Tint;
  add: string;
  placeholder: string;
  empty: string;
}[] = [
  {
    kind: 'like',
    title: 'Cibi che ami',
    icon: 'heart-bold-duotone',
    tint: 'rose',
    add: 'Aggiungi un cibo che ami',
    placeholder: 'Es. salmone, zucca, pistacchi',
    empty: 'Compariranno più spesso in idee e piani pasti.',
  },
  {
    kind: 'dislike',
    title: 'Non ti piacciono',
    icon: 'dislike-bold-duotone',
    tint: 'gray',
    add: 'Aggiungi un cibo da evitare',
    placeholder: 'Es. funghi, coriandolo',
    empty: 'Non te li proporrò mai.',
  },
  {
    kind: 'note',
    title: 'Abitudini e preferenze',
    icon: 'notebook-minimalistic-bold-duotone',
    tint: 'blue',
    add: 'Aggiungi un’abitudine',
    placeholder: 'Es. a pranzo mangio in mensa',
    empty: 'Orari, allenamenti, dove mangi: tutto ciò che aiuta Nouri a consigliarti meglio.',
  },
];

export default function Memory() {
  return (
    <SheetProvider>
      <MemoryContent />
    </SheetProvider>
  );
}

function MemoryContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheet = useSheet();
  const toast = useToast();
  const memoryOn = useNouri((s) => s.memoryOn);
  const memories = useNouri((s) => s.memories);
  const shortcuts = useNouri((s) => s.shortcuts);
  const meals = useNouri((s) => s.meals);
  const profile = useNouri((s) => s.profile);
  const plan = useNouri((s) => s.plan);
  const pastPlans = useNouri((s) => s.pastPlans);
  const planPrefs = useNouri((s) => s.planPrefs);
  const training = useNouri((s) => s.training);
  const workoutPlan = useNouri((s) => s.workoutPlan);
  const workoutLog = useNouri((s) => s.workoutLog);
  const activePlan = plan && plan.days.some((d) => d.date >= dayKey()) ? plan : null;

  const openShortcut = (sc: Shortcut) =>
    sheet.open({
      title: sc.name,
      subtitle: `${sc.meal.label} · ${formatKcal(mealTotals(sc.meal).kcal)} kcal · usata ${sc.uses} ${sc.uses === 1 ? 'volta' : 'volte'}`,
      render: (close) => (
        <View style={{ gap: 14 }}>
          <View style={styles.items}>
            {sc.meal.items.map((it, i) => (
              <View key={`${it.name}${i}`} style={styles.item}>
                <Sans size={16}>{it.emoji}</Sans>
                <Sans size={14} style={{ flex: 1 }} numberOfLines={1}>
                  {it.name}
                </Sans>
                <Sans size={13} color={colors.faint}>
                  {it.qty} · {formatKcal(it.kcal)} kcal
                </Sans>
              </View>
            ))}
          </View>
          <MenuGroup>
            <MenuRow
              icon="check-circle-bold-duotone"
              tint="mint"
              label="Registra adesso"
              hint="Finisce nel diario di oggi"
              onPress={() =>
                close(() => {
                  logShortcut(sc);
                  toast.show(`${sc.name} è nel diario`);
                })
              }
            />
            <MenuRow
              icon="trash-bin-trash-bold-duotone"
              label="Elimina la scorciatoia"
              danger
              onPress={() => close(() => useNouri.getState().removeShortcut(sc.id))}
            />
          </MenuGroup>
        </View>
      ),
    });

  const newShortcut = () => {
    // the last distinct meals from the diary, newest first
    const recent: Meal[] = [];
    for (const m of [...meals].sort((a, b) => b.at.localeCompare(a.at))) {
      if (!recent.some((r) => r.title === m.title)) recent.push(m);
      if (recent.length === 6) break;
    }
    sheet.open({
      title: 'Nuova scorciatoia',
      subtitle: recent.length ? 'Scegli un pasto dal diario' : undefined,
      render: (close) =>
        recent.length ? (
          <MenuGroup>
            {recent.map((m) => (
              <MenuRow
                key={m.id}
                label={m.title}
                hint={`${m.label} · ${formatTime(m.at)} · ${formatKcal(mealTotals(m).kcal)} kcal`}
                chevron
                onPress={() => close(() => nameShortcut(m))}
              />
            ))}
          </MenuGroup>
        ) : (
          <Sans size={14} color={colors.dim} center style={{ paddingVertical: 12, lineHeight: 21 }}>
            Registra un pasto in chat, poi salvalo con il segnalibro sulla sua card o scrivendo
            «salvalo come colazione solita».
          </Sans>
        ),
    });
  };

  const nameShortcut = (m: MealDraft) =>
    sheet.open({
      title: 'Salva come scorciatoia',
      render: (close) => (
        <ShortcutEditor
          meal={{ title: m.title, emoji: m.emoji, label: m.label, items: m.items }}
          close={close}
          onSaved={(n) => toast.show(`Scorciatoia «${n}» salvata`)}
        />
      ),
    });

  const openNote = (m: MemoryNote) =>
    sheet.open({
      title: m.text,
      subtitle: GROUPS.find((g) => g.kind === m.kind)?.title,
      render: (close) => (
        <MenuGroup>
          <MenuRow
            icon="trash-bin-trash-bold-duotone"
            label="Dimentica"
            danger
            onPress={() => close(() => useNouri.getState().removeMemory(m.id))}
          />
        </MenuGroup>
      ),
    });

  const addNote = (g: (typeof GROUPS)[number]) =>
    sheet.open({
      title: g.add,
      render: (close) => <NoteEditor kind={g.kind} placeholder={g.placeholder} close={close} />,
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

        <View style={{ alignItems: 'center', gap: 8 }}>
          <IconTile name="brain-bold-duotone" tint="violet" size={60} />
          <Display size={26} center>
            Memoria
          </Display>
          <Sans size={14} color={colors.faint} center style={{ maxWidth: 300, lineHeight: 20 }}>
            Quello che Nouri sa di te. Lo usa per idee, ricette e piani pasti.
          </Sans>
        </View>

        <MenuGroup
          footer={
            memoryOn
              ? 'Puoi anche dirlo in chat: «odio i funghi», «adoro il salmone», «ricordati che la sera mi alleno».'
              : 'Nouri non salva e non usa i tuoi gusti. Le scorciatoie funzionano comunque.'
          }>
          <MenuRow
            icon="brain-bold-duotone"
            tint="violet"
            label="Memoria attiva"
            right={
              <Switch
                value={memoryOn}
                onValueChange={(v) => {
                  haptic.select();
                  useNouri.getState().setMemoryOn(v);
                }}
                trackColor={{ true: colors.ink, false: colors.bgMuted }}
                thumbColor={colors.bg}
                // react-native-web colours the "on" thumb with its own prop
                {...({ activeThumbColor: colors.bg } as object)}
              />
            }
          />
        </MenuGroup>

        {profile && (
          <MenuGroup
            title="Il tuo profilo"
            footer={`Dall’onboarding del ${new Date(profile.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}: Nouri non te lo richiede più. Tocca per cambiare qualcosa, o dillo in chat («ora peso 68 kg»).`}>
            <MenuRow
              icon="user-rounded-bold-duotone"
              tint="gray"
              label="Nome"
              value={profile.name}
              chevron
              onPress={() => router.push('/profile')}
            />
            <MenuRow
              icon={goalIcons[profile.goal].icon}
              tint={goalIcons[profile.goal].tint}
              label="Obiettivo"
              value={goalLabels[profile.goal]}
              chevron
              onPress={() => router.push('/profile')}
            />
            <MenuRow
              icon={dietIcons[profile.diet].icon}
              tint={dietIcons[profile.diet].tint}
              label="Alimentazione"
              value={dietLabels[profile.diet]}
              chevron
              onPress={() => router.push('/profile')}
            />
            <MenuRow
              icon="forbidden-circle-bold-duotone"
              tint="rose"
              label="Evito"
              value={profile.avoid.length ? profile.avoid.join(', ') : 'Nulla'}
              chevron
              onPress={() => router.push('/profile')}
            />
            <MenuRow
              icon="scale-bold-duotone"
              tint="blue"
              label="Peso"
              value={profile.weight ? `${profile.weight} kg` : 'Non indicato'}
              chevron
              onPress={() => router.push('/profile')}
            />
            <MenuRow
              icon={activityIcons[profile.activity].icon}
              tint={activityIcons[profile.activity].tint}
              label="Attività"
              value={activityLabels[profile.activity]}
              chevron
              onPress={() => router.push('/profile')}
            />
          </MenuGroup>
        )}

        <MenuGroup
          title="Piano pasti"
          footer="Nouri ricorda il piano giorno per giorno: chiedigli «cosa mangio stasera?» o «cosa c’è giovedì a pranzo?». I piani precedenti restano salvati per riusarli.">
          <MenuRow
            icon="calendar-bold-duotone"
            tint="violet"
            label="Piano attivo"
            value={activePlan ? planTitle(activePlan) : 'Nessuno'}
            chevron
            onPress={() => router.push('/meal-plan')}
          />
          <MenuRow
            icon="tuning-bold-duotone"
            tint="gray"
            label="Predefinito"
            value={`${kindLabel(planPrefs.kind)} · ${focusLabels[planPrefs.focus]}`}
            chevron
            onPress={() =>
              sheet.open({
                title: 'Quando chiedi un piano',
                subtitle: 'Nouri usa queste scelte se non dici altro',
                render: () => <PlanPrefsEditor />,
              })
            }
          />
          {pastPlans.length > 0 ? (
            <MenuRow
              icon="history-linear"
              label="Piani salvati"
              value={String(pastPlans.length)}
              chevron
              onPress={() => router.push('/meal-plan')}
            />
          ) : null}
        </MenuGroup>

        {training.enabled && (
          <MenuGroup
            title="Allenamento"
            footer="Nouri usa la scheda per rispondere a «cosa mi alleno oggi?» e tiene conto degli allenamenti fatti.">
            {training.setup ? (
              <MenuRow
                icon={GOAL_ICON[training.setup.goal].icon}
                tint={GOAL_ICON[training.setup.goal].tint}
                label="Obiettivo"
                value={GOAL_LABELS[training.setup.goal]}
              />
            ) : null}
            <MenuRow
              icon="dumbbells-2-bold-duotone"
              tint="mint"
              label="Scheda"
              value={
                workoutPlan
                  ? `${workoutPlan.sessions.length} a settimana · ${workoutPlan.setup.minutes} min`
                  : 'Da creare'
              }
              chevron
              onPress={() => router.push('/training')}
            />
            <MenuRow
              icon="medal-ribbon-star-bold-duotone"
              tint="amber"
              label="Fatti questa settimana"
              value={String(workoutLog.filter((l) => l.date >= weekStart()).length)}
            />
          </MenuGroup>
        )}

        <MenuGroup
          title="Scorciatoie"
          footer="Scrivi il nome in chat («colazione solita», «il solito pranzo») o toccala dal + per registrarla in un attimo.">
          {shortcuts.map((sc) => (
            <MenuRow
              key={sc.id}
              icon="bolt-circle-bold-duotone"
              tint="amber"
              label={sc.name}
              hint={`${sc.meal.label} · ${formatKcal(mealTotals(sc.meal).kcal)} kcal · ${sc.meal.items
                .map((i) => i.name.toLowerCase())
                .join(', ')}`}
              chevron
              onPress={() => openShortcut(sc)}
            />
          ))}
          <MenuRow icon="add-linear" label="Nuova scorciatoia" onPress={newShortcut} />
        </MenuGroup>

        {GROUPS.map((g) => {
          const list = memories.filter((m) => m.kind === g.kind);
          return (
            <MenuGroup key={g.kind} title={g.title} footer={list.length ? undefined : g.empty}>
              {list.map((m) => (
                <MenuRow
                  key={m.id}
                  icon={g.icon}
                  tint={g.tint}
                  label={m.text}
                  chevron
                  onPress={() => openNote(m)}
                />
              ))}
              <MenuRow icon="add-linear" label={g.add} onPress={() => addNote(g)} />
            </MenuGroup>
          );
        })}

        {memories.length > 0 && (
          <MenuGroup>
            <MenuRow
              icon="trash-bin-trash-bold-duotone"
              label="Cancella tutti i ricordi"
              danger
              onPress={() =>
                sheet.open({
                  title: 'Cancellare tutti i ricordi?',
                  subtitle: 'Gusti e abitudini. Le scorciatoie restano.',
                  render: (close) => (
                    <View style={{ gap: 10 }}>
                      <PrimaryButton
                        label="Cancella ricordi"
                        style={{ backgroundColor: colors.rose }}
                        onPress={() => close(() => useNouri.setState({ memories: [] }))}
                      />
                      <PrimaryButton label="Annulla" variant="outline" onPress={() => close()} />
                    </View>
                  ),
                })
              }
            />
          </MenuGroup>
        )}
      </ScrollView>
      <Toast message={toast.message} bottom={insets.bottom + 24} />
    </View>
  );
}

function NoteEditor({
  kind,
  placeholder,
  close,
}: {
  kind: MemoryKind;
  placeholder: string;
  close: CloseSheet;
}) {
  const [text, setText] = useState('');
  const save = () => {
    const items =
      kind === 'note'
        ? [text.trim()]
        : text
            .split(/,|\se\s/)
            .map((t) => t.trim())
            .filter(Boolean);
    const clean = items
      .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
      .filter((t) => t.length > 1);
    if (!clean.length) return;
    useNouri.getState().remember(clean.map((t) => ({ kind, text: t })));
    haptic.success();
    close();
  };
  return (
    <View style={{ gap: 14 }}>
      <TextInput
        value={text}
        onChangeText={setText}
        autoFocus
        maxLength={80}
        returnKeyType="done"
        onSubmitEditing={save}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        selectionColor={colors.ink}
        style={styles.input}
      />
      <PrimaryButton label="Salva" disabled={!text.trim()} onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  items: { borderRadius: radii.md, backgroundColor: colors.bgSubtle, paddingVertical: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    height: 50,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
});
