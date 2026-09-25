import { useRouter } from 'expo-router';
import { ArrowUp, AudioLines, Camera, ImageIcon, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

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
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);

  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    setText('');
    onSend({ text: t });
  };

  const photo = async (source: 'camera' | 'library') => {
    setMenu(false);
    const img = await pickMealPhoto(source);
    if (!img) return;
    const caption = text.trim();
    setText('');
    onSend({ text: caption, image: img });
  };

  const hasText = text.trim().length > 0;

  return (
    <View style={styles.wrap}>
      {menu ? (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          style={styles.row}>
          {Platform.OS !== 'web' && (
            <Chip
              label="Fotocamera"
              icon={<Camera size={15} color={colors.ink} />}
              onPress={() => photo('camera')}
            />
          )}
          <Chip
            label={Platform.OS === 'web' ? 'Carica la foto del piatto' : 'Libreria'}
            icon={<ImageIcon size={15} color={colors.ink} />}
            onPress={() => photo('library')}
          />
        </Animated.View>
      ) : suggestions.length > 0 && !disabled ? (
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
        <IconButton
          label={menu ? 'Chiudi' : 'Aggiungi una foto'}
          onPress={() => setMenu((m) => !m)}
          style={[styles.plus, menu && { transform: [{ rotate: '45deg' }] }]}>
          <Plus size={20} color={colors.ink} strokeWidth={1.8} />
        </IconButton>
        <TextInput
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
            <ArrowUp size={18} color={colors.onAccent} strokeWidth={2.4} />
          </IconButton>
        ) : (
          <IconButton
            label="Parla con Nouri"
            filled
            size={36}
            onPress={() => router.push('/voice')}>
            <AudioLines size={17} color={colors.onAccent} strokeWidth={2} />
          </IconButton>
        )}
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
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
