import * as Speech from 'expo-speech';
import { useRouter } from 'expo-router';
import { ArrowUp, Keyboard, Mic, Square, X } from 'lucide-react-native';
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

import { Aurora } from '@/components/ui/Aurora';
import { Orb, type OrbState } from '@/components/ui/Orb';
import { Chip, Glass, IconButton } from '@/components/ui/Surface';
import { Mono, Serif } from '@/components/ui/Typography';
import { colors, fonts } from '@/constants/theme';
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
      ? 'Ti ascolto…'
      : state === 'thinking'
        ? 'Ci penso…'
        : state === 'speaking'
          ? 'Nouri sta parlando'
          : mic.supported
            ? 'Tocca e parla'
            : 'Detta con il microfono della tastiera';

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
      <Aurora preset="vivid" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
          <IconButton label="Chiudi" onPress={() => router.back()}>
            <X size={20} color={colors.ink} />
          </IconButton>
          <Mono upper size={11}>
            Modalità voce
          </Mono>
          <IconButton label="Torna alla chat" onPress={() => router.back()}>
            <Keyboard size={18} color={colors.ink} />
          </IconButton>
        </View>

        <View style={styles.center}>
          <Pressable onPress={mic.supported ? toggleMic : undefined}>
            <Orb size={236} state={state} level={level} />
          </Pressable>
          <Animated.View key={state} entering={FadeIn.duration(300)} style={{ marginTop: 36 }}>
            <Mono upper size={12} color={state === 'listening' ? colors.lime : colors.faint} center>
              {label}
            </Mono>
          </Animated.View>

          <View style={styles.transcript}>
            {mic.listening || (heard && !reply) ? (
              <Serif size={30} center color={colors.dim}>
                {mic.listening ? mic.transcript || '…' : `“${heard}”`}
              </Serif>
            ) : reply ? (
              <Animated.View entering={FadeInDown.duration(500)}>
                <Serif size={26} center>
                  {reply}
                </Serif>
                <Pressable
                  onPress={() => router.back()}
                  style={{ marginTop: 16, alignSelf: 'center' }}>
                  <Mono upper size={11} color={colors.lime}>
                    Vedi le card in chat →
                  </Mono>
                </Pressable>
              </Animated.View>
            ) : (
              <Serif size={30} center color={colors.dim}>
                Dimmi cosa hai mangiato, o chiedimi{' '}
                <Serif size={30} italic color={colors.ink}>
                  cosa cucinare
                </Serif>
                .
              </Serif>
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
          {mic.supported ? (
            <Pressable
              onPress={toggleMic}
              disabled={state === 'thinking'}
              style={({ pressed }) => [pressed && { transform: [{ scale: 0.94 }] }]}>
              <View
                style={[
                  styles.micBtn,
                  mic.listening && { backgroundColor: colors.lime },
                  state === 'thinking' && { opacity: 0.4 },
                ]}>
                {mic.listening || state === 'speaking' ? (
                  <Square
                    size={24}
                    color={mic.listening ? colors.onAccent : colors.ink}
                    fill={mic.listening ? colors.onAccent : colors.ink}
                  />
                ) : (
                  <Mic size={28} color={colors.ink} />
                )}
              </View>
            </Pressable>
          ) : (
            <Glass radius={30} intensity={50} style={styles.inputBar}>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                placeholder="Tocca 🎙️ sulla tastiera e parla"
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
                onPress={() => {
                  if (typed.trim()) ask(typed.trim());
                  setTyped('');
                }}>
                <ArrowUp size={20} color={colors.onAccent} />
              </IconButton>
            </Glass>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  transcript: { minHeight: 150, marginTop: 20, justifyContent: 'flex-start' },
  bottom: { alignItems: 'center', gap: 18, paddingHorizontal: 16 },
  prompts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  micBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardStrong,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    paddingLeft: 18,
    alignSelf: 'stretch',
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
