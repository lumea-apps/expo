import * as Speech from 'expo-speech';
import { useRouter } from 'expo-router';
import { ArrowUp, Mic, Square, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Orb, type OrbState } from '@/components/ui/Orb';
import { Chip, IconButton } from '@/components/ui/Surface';
import { Display, Sans } from '@/components/ui/Typography';
import { colors, fonts, radii } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { useSpeechInput } from '@/lib/useSpeechInput';
import { plain, speak, useSend } from '@/lib/useSend';

const PROMPTS = ['Ho mangiato un poke al salmone', 'Cosa mangio stasera?', 'Com’è andata oggi?'];

export default function Voice() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const send = useSend();
  const [state, setState] = useState<OrbState>('idle');
  const [heard, setHeard] = useState('');
  const [reply, setReply] = useState('');
  const [typed, setTyped] = useState('');
  const level = useSharedValue(0);

  const ask = async (text: string) => {
    setHeard(text);
    setReply('');
    setState('thinking');
    const r = await send({ text });
    if (!r) {
      setState('idle');
      return;
    }
    setReply(plain(r.text));
    setState('speaking');
    speak(r.text, () => setState('idle'));
  };

  const mic = useSpeechInput(ask);

  useEffect(() => {
    if (mic.listening) setState('listening');
    else if (state === 'listening') setState('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.listening]);

  // Drive the orb with a soft pseudo-level while listening or speaking.
  useEffect(() => {
    if (state !== 'listening' && state !== 'speaking') {
      level.value = withTiming(0, { duration: 400 });
      return;
    }
    const id = setInterval(() => {
      level.value = withTiming(0.15 + Math.random() * (state === 'speaking' ? 0.55 : 0.4), {
        duration: 160,
      });
    }, 170);
    return () => clearInterval(id);
  }, [state, level]);

  useEffect(() => () => void Speech.stop(), []);

  const label =
    state === 'listening'
      ? 'Ti ascolto'
      : state === 'thinking'
        ? 'Ci penso'
        : state === 'speaking'
          ? 'Nouri sta parlando'
          : mic.supported
            ? 'Tocca il microfono e parla'
            : 'Scrivi o detta la tua domanda';

  const toggleMic = () => {
    haptic.tap();
    if (state === 'speaking') {
      Speech.stop();
      setState('idle');
      return;
    }
    if (mic.listening) mic.stop();
    else if (state === 'idle') mic.start();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
          <Sans size={15} weight="semi">
            Nouri
          </Sans>
          <Sans size={13} color={colors.faint}>
            Modalità voce
          </Sans>
        </View>

        <View style={styles.center}>
          <Pressable onPress={mic.supported ? toggleMic : undefined}>
            <Orb size={220} state={state} level={level} />
          </Pressable>
          <Animated.View key={state} entering={FadeIn.duration(300)} style={{ marginTop: 40 }}>
            <Sans size={14} color={state === 'listening' ? colors.ink : colors.faint} center>
              {label}
            </Sans>
          </Animated.View>

          <View style={styles.transcript}>
            {mic.listening || (heard && !reply) ? (
              <Display size={22} center muted={!mic.listening}>
                {mic.listening ? mic.transcript || '…' : heard}
              </Display>
            ) : reply ? (
              <Animated.View entering={FadeInDown.duration(400)}>
                <Display size={20} center style={{ lineHeight: 28 }}>
                  {reply}
                </Display>
                <Pressable
                  onPress={() => router.back()}
                  style={{ marginTop: 14, alignSelf: 'center' }}>
                  <Sans size={13} weight="medium" color={colors.dim}>
                    Vedi i dettagli in chat
                  </Sans>
                </Pressable>
              </Animated.View>
            ) : (
              <Display size={22} center muted>
                Dimmi cosa hai mangiato o chiedimi cosa cucinare.
              </Display>
            )}
          </View>
        </View>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
          {state === 'idle' && !heard && (
            <View style={styles.prompts}>
              {PROMPTS.map((p) => (
                <Chip key={p} label={p} onPress={() => ask(p)} />
              ))}
            </View>
          )}
          {!mic.supported && (
            <View style={styles.inputBar}>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                placeholder="Detta con il microfono della tastiera"
                placeholderTextColor={colors.faint}
                style={styles.input}
                returnKeyType="send"
                onSubmitEditing={() => {
                  if (typed.trim()) ask(typed.trim());
                  setTyped('');
                }}
              />
              <IconButton
                label="Invia"
                filled
                size={36}
                disabled={!typed.trim()}
                onPress={() => {
                  if (typed.trim()) ask(typed.trim());
                  setTyped('');
                }}>
                <ArrowUp size={18} color={typed.trim() ? colors.onAccent : colors.faint} />
              </IconButton>
            </View>
          )}
          <View style={styles.controls}>
            <Pressable
              accessibilityLabel="Chiudi la modalità voce"
              onPress={() => {
                haptic.tap();
                router.back();
              }}
              style={({ pressed }) => [styles.round, pressed && { opacity: 0.7 }]}>
              <X size={22} color={colors.ink} />
            </Pressable>
            {mic.supported && (
              <Pressable
                accessibilityLabel={mic.listening ? 'Smetti di ascoltare' : 'Parla'}
                onPress={toggleMic}
                disabled={state === 'thinking'}
                style={({ pressed }) => [
                  styles.round,
                  styles.mic,
                  state === 'thinking' && { opacity: 0.35 },
                  pressed && { opacity: 0.8 },
                ]}>
                {mic.listening || state === 'speaking' ? (
                  <Square size={20} color={colors.onAccent} fill={colors.onAccent} />
                ) : (
                  <Mic size={24} color={colors.onAccent} />
                )}
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', gap: 2, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  transcript: { minHeight: 130, marginTop: 14, justifyContent: 'flex-start' },
  bottom: { alignItems: 'center', gap: 18, paddingHorizontal: 16 },
  prompts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  controls: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  round: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgMuted,
  },
  mic: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.ink },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingLeft: 18,
    paddingRight: 8,
    alignSelf: 'stretch',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  input: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
    height: 44,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
  },
});
