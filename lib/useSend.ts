import * as Speech from 'expo-speech';
import { useCallback } from 'react';

import { askNouri, type BrainReply, type UserInput } from './ai';
import { haptic } from './haptics';
import { applyProfilePatch, dayKey } from './nutrition';
import { useNouri } from './store';

/** Strips the light markdown we use in replies so TTS reads clean sentences. */
export function plain(text: string): string {
  return text.replace(/\*\*|\*/g, '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
}

export function speak(text: string, onDone?: () => void) {
  Speech.stop();
  Speech.speak(plain(text), {
    language: 'it-IT',
    rate: 1.02,
    pitch: 1.0,
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

/**
 * Sends a user message to Nouri and appends the reply to the conversation.
 * Returns the reply so voice mode can read it aloud.
 */
export function useSend() {
  return useCallback(
    async (input: UserInput, opts: { speak?: boolean } = {}): Promise<BrainReply | null> => {
      const s = useNouri.getState();
      if (!s.profile || s.thinking) return null;
      const text = input.text.trim();
      if (!text && !input.image) return null;

      haptic.tap();
      const history = s.messages;
      s.pushMessage({ role: 'user', text, imageUri: input.image?.uri });
      s.setThinking(true);
      try {
        const fresh = useNouri.getState();
        const reply = await askNouri(
          { ...input, text },
          {
            profile: fresh.profile!,
            meals: fresh.meals,
            waterToday: fresh.water[dayKey()] ?? 0,
            history,
          }
        );
        if (reply.waterMl > 0) useNouri.getState().addWater(reply.waterMl);
        const widgets = [...reply.widgets];
        const current = useNouri.getState().profile;
        if (reply.profilePatch && current) {
          const { profile, changes } = applyProfilePatch(current, reply.profilePatch);
          if (changes.length) {
            useNouri.getState().setProfile(profile);
            widgets.unshift({
              type: 'targets',
              before: current.targets,
              after: profile.targets,
              changes,
            });
          }
        }
        const replyText = reply.degraded
          ? `${reply.text}\n\n*(Claude non è raggiungibile: ho risposto in modalità offline.)*`
          : reply.text;
        useNouri.getState().pushMessage(
          {
            role: 'assistant',
            text: replyText,
            widgets,
            suggestions: reply.suggestions,
            engine: reply.engine,
          },
          true
        );
        haptic.soft();
        if (opts.speak || useNouri.getState().speakReplies) speak(reply.text);
        return reply;
      } finally {
        useNouri.getState().setThinking(false);
      }
    },
    []
  );
}
