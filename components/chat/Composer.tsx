import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Icon } from '@/components/ui/Icon';
import { ActionTiles, MenuGroup, MenuRow } from '@/components/ui/Menu';
import { useSheet } from '@/components/ui/Sheet';
import { Chip, Glass, IconButton } from '@/components/ui/Surface';
import { colors, fonts } from '@/constants/theme';
import type { UserInput } from '@/lib/ai';
import { pickMealPhoto } from '@/lib/pickImage';

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

  const openAttach = () =>
    sheet.open({
      render: (close) => (
        <View>
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
              {
                icon: 'waterdrop-bold-duotone',
                tint: 'sky',
                label: 'Un bicchiere',
                onPress: () => close(() => onSend({ text: 'Ho bevuto un bicchiere d’acqua' })),
              },
            ]}
          />
          <MenuGroup>
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
              icon="chef-hat-heart-bold-duotone"
              tint="amber"
              label="Idee per il prossimo pasto"
              onPress={() => close(() => onSend({ text: 'Idee per il prossimo pasto' }))}
            />
            <MenuRow
              icon="stopwatch-bold-duotone"
              tint="mint"
              label="Ricetta veloce e proteica"
              onPress={() => close(() => onSend({ text: 'Una ricetta veloce e proteica' }))}
            />
            <MenuRow
              icon="cart-large-2-bold-duotone"
              tint="mint"
              label="Lista della spesa"
              onPress={() => close(() => onSend({ text: 'Fammi la lista della spesa' }))}
            />
            <MenuRow
              icon="pie-chart-2-bold-duotone"
              tint="violet"
              label="Riepilogo di oggi"
              onPress={() => close(() => onSend({ text: 'Com’è andata oggi?' }))}
            />
          </MenuGroup>
        </View>
      ),
    });

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
