import { useRouter } from 'expo-router';
import { ArrowUp, AudioLines, Camera, ImageIcon, X } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';

import { Chip, Glass, IconButton } from '@/components/ui/Surface';
import { colors, fonts } from '@/constants/theme';
import { pickMealPhoto } from '@/lib/pickImage';
import type { UserInput } from '@/lib/ai';

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

  return (
    <View style={styles.wrap}>
      {menu ? (
        <Animated.View
          entering={FadeInDown.springify().damping(18)}
          exiting={FadeOut.duration(120)}
          style={styles.row}>
          {Platform.OS !== 'web' && (
            <Chip
              label="Scatta una foto"
              icon={<Camera size={15} color={colors.ink} />}
              onPress={() => photo('camera')}
            />
          )}
          <Chip
            label={Platform.OS === 'web' ? 'Carica una foto del piatto' : 'Dalla galleria'}
            icon={<ImageIcon size={15} color={colors.ink} />}
            onPress={() => photo('library')}
          />
        </Animated.View>
      ) : suggestions.length > 0 && !disabled ? (
        <Animated.View entering={FadeIn.delay(300)} exiting={FadeOut.duration(120)}>
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
            {suggestions.map((s) => (
              <Chip key={s} label={s} accent onPress={() => onSend({ text: s })} />
            ))}
          </ScrollView>
        </Animated.View>
      ) : null}

      <Glass radius={30} intensity={50} style={styles.bar}>
        <IconButton label={menu ? 'Chiudi' : 'Aggiungi foto'} onPress={() => setMenu((m) => !m)}>
          {menu ? <X size={20} color={colors.ink} /> : <Camera size={20} color={colors.ink} />}
        </IconButton>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Racconta a Nouri cosa mangi…"
          placeholderTextColor={colors.faint}
          multiline
          // web renders a <textarea>: keep it one row tall until the user types more
          numberOfLines={Platform.OS === 'web' ? 1 : undefined}
          style={styles.input}
          selectionColor={colors.lime}
          onKeyPress={(e) => {
            // Enter sends on web; Shift+Enter keeps the newline.
            const ev = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
            if (Platform.OS === 'web' && ev.key === 'Enter' && !ev.shiftKey) {
              (e as unknown as { preventDefault: () => void }).preventDefault();
              submit();
            }
          }}
        />
        {text.trim() ? (
          <Animated.View key="send" entering={ZoomIn.springify().damping(14)}>
            <IconButton label="Invia" filled onPress={submit}>
              <ArrowUp size={20} color={colors.onAccent} strokeWidth={2.5} />
            </IconButton>
          </Animated.View>
        ) : (
          <Animated.View key="voice" entering={ZoomIn.springify().damping(14)}>
            <IconButton
              label="Parla con Nouri"
              onPress={() => router.push('/voice')}
              style={styles.voice}>
              <AudioLines size={20} color={colors.lime} />
            </IconButton>
          </Animated.View>
        )}
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, padding: 6 },
  input: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 4,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  voice: { backgroundColor: 'rgba(212,255,58,0.12)', borderColor: 'rgba(212,255,58,0.35)' },
});
