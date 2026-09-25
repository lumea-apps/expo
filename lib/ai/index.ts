import { claudeConfigured, claudeRespond, CLAUDE_MODEL } from './claude';
import { localRespond, quickRespond } from './local';
import type { BrainContext, BrainReply, UserInput } from './types';

export type { BrainContext, BrainReply, UserInput } from './types';

export const engineInfo = claudeConfigured
  ? { id: 'claude' as const, label: 'Claude', detail: CLAUDE_MODEL }
  : { id: 'local' as const, label: 'Demo offline', detail: 'motore locale, nessuna chiave' };

const MIN_THINK_MS = 900;

/**
 * Ask Nouri. Uses Claude when configured and falls back to the offline brain
 * if the request fails, so the conversation never dead-ends.
 */
export async function askNouri(input: UserInput, ctx: BrainContext): Promise<BrainReply> {
  // Shortcuts ("la solita colazione") answer instantly, with or without Claude.
  const quick = quickRespond(input, ctx);
  if (quick) {
    await new Promise((r) => setTimeout(r, 350));
    return quick;
  }
  const started = Date.now();
  let reply: BrainReply;
  if (claudeConfigured) {
    try {
      reply = await claudeRespond(input, ctx);
    } catch (err) {
      console.warn('[nouri] Claude request failed, using offline brain', err);
      reply = { ...localRespond(input, ctx), degraded: true };
    }
  } else {
    reply = localRespond(input, ctx);
  }
  // Let the "thinking" orb breathe for a beat even when the answer is instant.
  const elapsed = Date.now() - started;
  if (elapsed < MIN_THINK_MS) await new Promise((r) => setTimeout(r, MIN_THINK_MS - elapsed));
  return reply;
}
