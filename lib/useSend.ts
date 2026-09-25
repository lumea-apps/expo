import * as Speech from 'expo-speech';
import { useCallback } from 'react';

import { askNouri, type BrainContext, type BrainReply, type UserInput } from './ai';
import { haptic } from './haptics';
import { applyProfilePatch, dayKey } from './nutrition';
import { useNouri } from './store';
import type { MemoryChange, MemoryOps, Widget } from './types';

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

/** What the brains see: profile, diary, memory (only when on), shortcuts and the active plan. */
export function brainContext(history = useNouri.getState().messages): BrainContext | null {
  const s = useNouri.getState();
  if (!s.profile) return null;
  return {
    profile: s.profile,
    meals: s.meals,
    waterToday: s.water[dayKey()] ?? 0,
    history,
    memoryOn: s.memoryOn,
    memories: s.memoryOn ? s.memories : [],
    shortcuts: s.shortcuts,
    plan: s.plan,
    pastPlans: s.pastPlans,
    planPrefs: s.planPrefs,
  };
}

/** Applies memory changes from a reply and returns what actually changed, for the chat card. */
export function applyMemory(ops: MemoryOps | undefined): MemoryChange[] {
  if (!ops) return [];
  const s = useNouri.getState();
  const changes: MemoryChange[] = [];
  if (ops.shortcut) {
    s.saveShortcut(ops.shortcut.name, ops.shortcut.meal);
    changes.push({ kind: 'shortcut', text: ops.shortcut.name });
  }
  if (s.memoryOn) {
    if (ops.forget?.length) changes.push(...s.forget(ops.forget));
    if (ops.add?.length) changes.push(...s.remember(ops.add));
  }
  return changes;
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
        const reply = await askNouri({ ...input, text }, brainContext(history)!);
        if (reply.waterMl > 0) useNouri.getState().addWater(reply.waterMl);
        const widgets: Widget[] = [...reply.widgets];
        const remembered = applyMemory(reply.memory);
        if (remembered.length) widgets.push({ type: 'memory', changes: remembered });
        // a new meal plan becomes the active one
        const newPlan = widgets.find(
          (w): w is Extract<Widget, { type: 'meal_plan' }> => w.type === 'meal_plan'
        );
        if (newPlan && newPlan.plan.id !== useNouri.getState().plan?.id) {
          useNouri.getState().setPlan(newPlan.plan);
        }
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
        const msg = useNouri.getState().pushMessage(
          {
            role: 'assistant',
            text: replyText,
            widgets,
            suggestions: reply.suggestions,
            engine: reply.engine,
          },
          true
        );
        if (reply.autoLog) {
          const i = widgets.findIndex((w) => w.type === 'meal_log');
          const w = widgets[i];
          if (w?.type === 'meal_log') {
            useNouri.getState().logMeal(w.meal, 'shortcut', `${msg.id}:${i}`);
            useNouri.getState().countShortcutUse(reply.autoLog.shortcutId);
            haptic.success();
          }
        }
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
