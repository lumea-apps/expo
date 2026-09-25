import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Icon } from '@/components/ui/Icon';
import { ActionTiles, MenuGroup, MenuRow } from '@/components/ui/Menu';
import { useSheet } from '@/components/ui/Sheet';
import { Chip, Glass, IconButton } from '@/components/ui/Surface';
import { colors, fonts } from '@/constants/theme';
import type { UserInput } from '@/lib/ai';
import { formatKcal, mealTotals } from '@/lib/nutrition';
import { pickMealPhoto } from '@/lib/pickImage';
import { logShortcut } from '@/lib/shortcuts';
import { useNouri } from '@/lib/store';

export function Composer({
  suggestions,
  disabled,
  onSend,
}: {
  suggestions: string[];
  disabled?: boolean;
  onSend: (input: UserInput) => void;
}) {
  const router = useRouter();
  const sheet = useSheet();
  const { height } = useWindowDimensions();
  const input = useRef<TextInput>(null);
  const [text, setText] = useState('');

  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    setText('');
    onSend({ text: t });
  };

  const photo = async (source: 'camera' | 'library') => {
    const img = await pickMealPhoto(source);
    if (!img) return;
    const caption = text.trim();
    setText('');
    onSend({ text: caption, image: img });
  };

  const openAttach = () => {
    const { shortcuts, plan, training, workoutPlan } = useNouri.getState();
    const favourite = [...shortcuts].sort((a, b) => b.uses - a.uses).slice(0, 3);
    const trainingOn = training.enabled && Boolean(workoutPlan);
    sheet.open({
      render: (close) => (
        <ScrollView
          style={{ maxHeight: Math.round(height * 0.72) }}
          showsVerticalScrollIndicator={false}>
          <ActionTiles
            items={[
              ...(Platform.OS !== 'web'
                ? [
                    {
                      icon: 'camera-bold-duotone' as const,
                      tint: 'blue' as const,
                      label: 'Fotocamera',
                      onPress: () => close(() => photo('camera')),
                    },
                  ]
                : []),
              {
                icon: 'gallery-bold-duotone',
                tint: 'violet',
                label: Platform.OS === 'web' ? 'Foto del piatto' : 'Galleria',
                onPress: () => close(() => photo('library')),
              },
              Platform.OS !== 'web'
                ? {
                    icon: 'barcode-scan-bold-duotone',
                    tint: 'gray',
                    label: 'Codice a barre',
                    onPress: () =>
                      close(() => router.push({ pathname: '/search', params: { scan: '1' } })),
                  }
                : {
                    icon: 'waterdrop-bold-duotone',
                    tint: 'sky',
                    label: 'Acqua',
                    onPress: () => close(() => onSend({ text: 'Ho bevuto un bicchiere d’acqua' })),
                  },
            ]}
          />
          {favourite.length > 0 && (
            <MenuGroup title="Scorciatoie" style={styles.group}>
              {favourite.map((sc) => (
                <MenuRow
                  key={sc.id}
                  icon="bolt-circle-bold-duotone"
                  tint="amber"
                  label={sc.name}
                  hint={`Registra subito · ${formatKcal(mealTotals(sc.meal).kcal)} kcal`}
                  onPress={() => close(() => logShortcut(sc))}
                />
              ))}
            </MenuGroup>
          )}
          <MenuGroup title="Alimentazione" style={styles.group}>
            <MenuRow
              icon="magnifer-bold-duotone"
              tint="blue"
              label="Cerca valori nutrizionali"
              hint="Alimenti e prodotti, anche col codice a barre"
              onPress={() => close(() => router.push('/search'))}
            />
            <MenuRow
              icon="calendar-bold-duotone"
              tint="violet"
              label={plan ? 'Il tuo piano pasti' : 'Piano pasti'}
              hint={plan ? 'Oggi, la settimana e la spesa' : 'Per oggi o per tutta la settimana'}
              onPress={() => close(() => router.push('/meal-plan'))}
            />
            <MenuRow
              icon="plate-bold-duotone"
              tint="peach"
              label="Registra un pasto"
              hint="Scrivilo come lo diresti a un amico"
              onPress={() =>
                close(() => {
                  setText('Ho mangiato ');
                  setTimeout(() => input.current?.focus(), 50);
                })
              }
            />
            <MenuRow
              icon="pie-chart-2-bold-duotone"
              tint="mint"
              label="Diario di oggi"
              hint="Calorie, macro, acqua e pasti"
              onPress={() => close(() => router.push('/today'))}
            />
            {Platform.OS !== 'web' ? (
              <MenuRow
                icon="waterdrop-bold-duotone"
                tint="sky"
                label="Un bicchiere d’acqua"
                onPress={() => close(() => onSend({ text: 'Ho bevuto un bicchiere d’acqua' }))}
              />
            ) : null}
          </MenuGroup>
          <MenuGroup
            title="Allenamento"
            footer={trainingOn ? undefined : 'Facoltativo: attivalo solo se ti serve.'}
            style={styles.group}>
            <MenuRow
              icon="dumbbells-2-bold-duotone"
              tint="mint"
              label={trainingOn ? 'La tua scheda' : 'Scheda di allenamento'}
              hint={trainingOn ? 'Oggi e il resto della settimana' : 'Creala in pochi tocchi'}
              onPress={() => close(() => router.push('/training'))}
            />
            <MenuRow
              icon="dumbbell-small-bold-duotone"
              tint="gray"
              label="Cerca esercizio"
              hint="Come si fa, muscoli, errori da evitare"
              onPress={() => close(() => router.push('/exercises'))}
            />
          </MenuGroup>
          <MenuGroup style={styles.group}>
            <MenuRow
              icon="brain-bold-duotone"
              tint="violet"
              label="Memoria"
              hint="Gusti, abitudini e scorciatoie"
              onPress={() => close(() => router.push('/memory'))}
            />
          </MenuGroup>
        </ScrollView>
      ),
    });
  };

  const hasText = text.trim().length > 0;

  return (
    <View style={styles.wrap}>
      {suggestions.length > 0 && !disabled ? (
        <Animated.View entering={FadeIn.delay(250)} exiting={FadeOut.duration(120)}>
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
            {suggestions.map((s) => (
              <Chip key={s} label={s} onPress={() => onSend({ text: s })} />
            ))}
          </ScrollView>
        </Animated.View>
      ) : null}

      <Glass radius={26} style={styles.bar}>
        <IconButton label="Allega o scegli un’azione" onPress={openAttach} style={styles.plus}>
          <Icon name="add-linear" size={22} />
        </IconButton>
        <TextInput
          ref={input}
          value={text}
          onChangeText={setText}
          placeholder="Chiedi a Nouri"
          placeholderTextColor={colors.faint}
          multiline
          // web renders a <textarea>: keep it one row tall until the user types more
          numberOfLines={Platform.OS === 'web' ? 1 : undefined}
          style={styles.input}
          selectionColor={colors.ink}
          onKeyPress={(e) => {
            // Enter sends on web; Shift+Enter keeps the newline.
            const ev = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
            if (Platform.OS === 'web' && ev.key === 'Enter' && !ev.shiftKey) {
              (e as unknown as { preventDefault: () => void }).preventDefault();
              submit();
            }
          }}
        />
        {hasText ? (
          <IconButton label="Invia" filled size={36} onPress={submit} disabled={disabled}>
            <Icon name="arrow-up-linear" size={20} color={colors.onAccent} />
          </IconButton>
        ) : (
          <IconButton
            label="Parla con Nouri"
            filled
            size={36}
            onPress={() => router.push('/voice')}>
            <Icon name="soundwave-linear" size={20} color={colors.onAccent} />
          </IconButton>
        )}
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  group: { marginTop: 16 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, padding: 6 },
  plus: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  input: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
    minHeight: 36,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
});
