import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import type { CloseSheet } from '@/components/ui/Sheet';
import { PrimaryButton } from '@/components/ui/Surface';
import { Mono, Sans } from '@/components/ui/Typography';
import { colors, fonts, radii } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { formatKcal, mealTotals } from '@/lib/nutrition';
import { defaultShortcutName } from '@/lib/shortcuts';
import { useNouri } from '@/lib/store';
import type { MealDraft } from '@/lib/types';

/** Names a meal and saves it as a shortcut. */
export function ShortcutEditor({
  meal,
  close,
  onSaved,
}: {
  meal: MealDraft;
  close: CloseSheet;
  onSaved?: (name: string) => void;
}) {
  const [name, setName] = useState(defaultShortcutName(meal.label));
  const tot = mealTotals(meal);
  const save = () => {
    const n = name.trim();
    if (!n) return;
    useNouri.getState().saveShortcut(n, meal);
    haptic.success();
    close(() => onSaved?.(n));
  };
  return (
    <View style={{ gap: 14 }}>
      <TextInput
        value={name}
        onChangeText={setName}
        autoFocus
        selectTextOnFocus
        maxLength={32}
        returnKeyType="done"
        onSubmitEditing={save}
        placeholder="Es. Colazione solita"
        placeholderTextColor={colors.faint}
        selectionColor={colors.ink}
        style={styles.input}
      />
      <View style={styles.preview}>
        <View style={{ flex: 1 }}>
          <Sans size={13} color={colors.faint}>
            {meal.label}
          </Sans>
          <Sans size={14} weight="medium" numberOfLines={2}>
            {meal.items.map((i) => i.name).join(', ')}
          </Sans>
        </View>
        <Mono size={14} weight="medium" color={colors.ink}>
          {formatKcal(tot.kcal)} kcal
        </Mono>
      </View>
      <Sans size={13} color={colors.faint} style={{ lineHeight: 19 }}>
        La prossima volta basta scrivere il nome in chat, o toccarla dal +, per registrarla in un
        attimo.
      </Sans>
      <PrimaryButton label="Salva scorciatoia" disabled={!name.trim()} onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 50,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    color: colors.ink,
    fontFamily: fonts.sansMedium,
    fontSize: 17,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.bgSubtle,
  },
});
