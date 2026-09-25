import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Live dictation via the Web Speech API (Chrome, Edge, Safari).
 * On native, dictation goes through the keyboard's mic key instead
 * (see README for adding `expo-speech-recognition` in a dev build).
 */
export function useSpeechInput(onFinal: (text: string) => void) {
  const [supported] = useState(() => getCtor() !== null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const rec = useRef<Recognition | null>(null);
  const finalCb = useRef(onFinal);
  finalCb.current = onFinal;

  const stop = useCallback(() => {
    rec.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    rec.current?.abort();
    const r = new Ctor();
    r.lang = 'it-IT';
    r.interimResults = true;
    r.continuous = false;
    let finalText = '';
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      setTranscript(`${finalText}${interim}`);
    };
    r.onerror = () => setListening(false);
    r.onend = () => {
      setListening(false);
      if (finalText.trim()) finalCb.current(finalText.trim());
    };
    rec.current = r;
    setTranscript('');
    setListening(true);
    r.start();
  }, []);

  useEffect(() => () => rec.current?.abort(), []);

  return { supported, listening, transcript, start, stop, setTranscript };
}
