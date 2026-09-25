import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { planMealKey } from './mealplan';
import { forgets, sameMemory } from './memory';
import { dayKey, uid } from './nutrition';
import type {
  ChatMessage,
  FoodFacts,
  Meal,
  MealDraft,
  MealPlan,
  MemoryChange,
  MemoryKind,
  MemoryNote,
  OnboardingDraft,
  PlanPrefs,
  Profile,
  Shortcut,
} from './types';

interface NouriState {
  /** Set at the end of onboarding (its `createdAt` is when it was completed). */
  profile: Profile | null;
  /** Answers of an onboarding still in progress. */
  onboardingDraft: OnboardingDraft | null;
  meals: Meal[];
  water: Record<string, number>;
  messages: ChatMessage[];
  /** `${messageId}:${widgetIndex}` → logged meal id, so a card knows it was saved. */
  logged: Record<string, string>;
  checked: Record<string, boolean>;
  speakReplies: boolean;
  /** Day key of the last proactive morning brief, so it is posted once per day. */
  lastBrief: string | null;
  /** When off, Nouri neither saves nor uses memories (shortcuts keep working). */
  memoryOn: boolean;
  memories: MemoryNote[];
  shortcuts: Shortcut[];
  /** The active meal plan (the latest one generated). */
  plan: MealPlan | null;
  /** Plans replaced by a newer one, newest first: kept so they can be reused. */
  pastPlans: MealPlan[];
  /** Default duration and style for new plans (week unless the user picks otherwise). */
  planPrefs: PlanPrefs;
  /** planMealKey → logged meal id, so a planned meal shows as eaten. */
  planLog: Record<string, string>;
  /** Last foods picked in quick search, newest first. */
  recentFoods: FoodFacts[];

  // ephemeral (not persisted)
  hydrated: boolean;
  thinking: boolean;
  fresh: Record<string, true>;

  setProfile: (p: Profile) => void;
  setOnboardingDraft: (d: OnboardingDraft | null) => void;
  logMeal: (draft: MealDraft, source: Meal['source'], widgetKey?: string, at?: string) => Meal;
  removeMeal: (id: string) => void;
  addWater: (ml: number) => void;
  pushMessage: (m: Omit<ChatMessage, 'id' | 'at'>, animate?: boolean) => ChatMessage;
  settle: (id: string) => void;
  setThinking: (v: boolean) => void;
  toggleChecked: (key: string) => void;
  /** Unticks every key starting with `prefix` (a whole shopping list). */
  clearChecked: (prefix: string) => void;
  setSpeakReplies: (v: boolean) => void;
  markBrief: (day: string) => void;
  setMemoryOn: (v: boolean) => void;
  remember: (notes: { kind: MemoryKind; text: string }[]) => MemoryChange[];
  forget: (terms: string[]) => MemoryChange[];
  removeMemory: (id: string) => void;
  saveShortcut: (name: string, meal: MealDraft) => Shortcut;
  removeShortcut: (id: string) => void;
  countShortcutUse: (id: string) => void;
  /** Makes `plan` active; the plan it replaces is kept in `pastPlans`. */
  setPlan: (plan: MealPlan | null) => void;
  /**
   * Makes a new plan active, remembering what was already done: meals already
   * eaten on the same days are kept, items already bought stay ticked.
   */
  activatePlan: (plan: MealPlan) => MealPlan;
  removePastPlan: (id: string) => void;
  setPlanPrefs: (p: Partial<PlanPrefs>) => void;
  markPlanMeal: (key: string, mealId: string) => void;
  pushRecentFood: (f: FoodFacts) => void;
  clearChat: () => void;
  seedDemoWeek: () => void;
  resetAll: () => void;
}

export const useNouri = create<NouriState>()(
  persist(
    (set, get) => ({
      profile: null,
      onboardingDraft: null,
      meals: [],
      water: {},
      messages: [],
      logged: {},
      checked: {},
      speakReplies: false,
      lastBrief: null,
      memoryOn: true,
      memories: [],
      shortcuts: [],
      plan: null,
      pastPlans: [],
      planPrefs: { kind: 'week', focus: 'balanced' },
      planLog: {},
      recentFoods: [],
      hydrated: false,
      thinking: false,
      fresh: {},

      setProfile: (profile) => set({ profile, onboardingDraft: null }),

      setOnboardingDraft: (onboardingDraft) => set({ onboardingDraft }),

      logMeal: (draft, source, widgetKey, at) => {
        const meal: Meal = { ...draft, id: uid(), at: at ?? new Date().toISOString(), source };
        set((s) => {
          // eating a dish of today's plan (e.g. from its recipe card) ticks it off the plan
          const planLog = { ...s.planLog };
          const today = s.plan?.days.find((d) => d.date === dayKey(meal.at));
          if (s.plan && today && source !== 'plan') {
            const i = today.meals.findIndex(
              (m, idx) =>
                m.title.toLowerCase() === draft.title.toLowerCase() &&
                !planLog[planMealKey(s.plan!.id, today.date, idx)]
            );
            if (i !== -1) planLog[planMealKey(s.plan.id, today.date, i)] = meal.id;
          }
          return {
            meals: [...s.meals, meal],
            logged: widgetKey ? { ...s.logged, [widgetKey]: meal.id } : s.logged,
            planLog,
          };
        });
        return meal;
      },

      removeMeal: (id) =>
        set((s) => ({
          meals: s.meals.filter((m) => m.id !== id),
          logged: Object.fromEntries(Object.entries(s.logged).filter(([, v]) => v !== id)),
          planLog: Object.fromEntries(Object.entries(s.planLog).filter(([, v]) => v !== id)),
        })),

      addWater: (ml) =>
        set((s) => {
          const key = dayKey();
          return { water: { ...s.water, [key]: Math.max(0, (s.water[key] ?? 0) + ml) } };
        }),

      pushMessage: (m, animate = false) => {
        const msg: ChatMessage = { ...m, id: uid(), at: new Date().toISOString() };
        set((s) => ({
          messages: [...s.messages, msg],
          fresh: animate ? { ...s.fresh, [msg.id]: true } : s.fresh,
        }));
        return msg;
      },

      settle: (id) =>
        set((s) => {
          if (!s.fresh[id]) return s;
          const { [id]: _, ...rest } = s.fresh;
          return { fresh: rest };
        }),

      setThinking: (thinking) => set({ thinking }),

      toggleChecked: (key) => set((s) => ({ checked: { ...s.checked, [key]: !s.checked[key] } })),

      clearChecked: (prefix) =>
        set((s) => ({
          checked: Object.fromEntries(
            Object.entries(s.checked).filter(([k]) => !k.startsWith(prefix))
          ),
        })),

      setSpeakReplies: (speakReplies) => set({ speakReplies }),

      markBrief: (lastBrief) => set({ lastBrief }),

      setMemoryOn: (memoryOn) => set({ memoryOn }),

      remember: (notes) => {
        const changes: MemoryChange[] = [];
        set((s) => {
          let memories = [...s.memories];
          for (const n of notes) {
            const text = n.text.trim();
            if (!text || memories.some((m) => m.kind === n.kind && sameMemory(m.text, text)))
              continue;
            // loving something you said you disliked (or vice versa) replaces the old note
            if (n.kind !== 'note') {
              const opposite = n.kind === 'like' ? 'dislike' : 'like';
              memories = memories.filter((m) => !(m.kind === opposite && sameMemory(m.text, text)));
            }
            memories.push({ id: uid(), kind: n.kind, text, at: new Date().toISOString() });
            changes.push({ kind: n.kind, text });
          }
          return { memories };
        });
        return changes;
      },

      forget: (terms) => {
        const changes: MemoryChange[] = [];
        set((s) => ({
          memories: s.memories.filter((m) => {
            const hit = terms.some((t) => forgets(m, t));
            if (hit) changes.push({ kind: 'forget', text: m.text });
            return !hit;
          }),
        }));
        return changes;
      },

      removeMemory: (id) => set((s) => ({ memories: s.memories.filter((m) => m.id !== id) })),

      saveShortcut: (name, meal) => {
        const shortcut: Shortcut = {
          id: uid(),
          name: name.trim(),
          meal: { ...meal, items: meal.items.map(({ confidence: _, ...it }) => it) },
          at: new Date().toISOString(),
          uses: 0,
        };
        set((s) => ({
          shortcuts: [
            ...s.shortcuts.filter((x) => x.name.toLowerCase() !== shortcut.name.toLowerCase()),
            shortcut,
          ],
        }));
        return shortcut;
      },

      removeShortcut: (id) => set((s) => ({ shortcuts: s.shortcuts.filter((x) => x.id !== id) })),

      countShortcutUse: (id) =>
        set((s) => ({
          shortcuts: s.shortcuts.map((x) => (x.id === id ? { ...x, uses: x.uses + 1 } : x)),
        })),

      setPlan: (plan) =>
        set((s) => {
          const old = s.plan;
          const replaced = Boolean(plan && old && old.id !== plan.id);
          // the same dishes (a plan reused from history) are not kept twice
          const dishes = (p: MealPlan) =>
            p.days.map((d) => d.meals.map((m) => m.title).join('|')).join('/');
          const same = plan ? dishes(plan) : null;
          const history = replaced ? [old!, ...s.pastPlans] : s.pastPlans;
          return {
            plan,
            pastPlans: history
              .filter((p, i, all) => all.findIndex((x) => x.id === p.id) === i)
              .filter((p) => p.id !== plan?.id && dishes(p) !== same)
              .slice(0, 8),
          };
        }),

      activatePlan: (plan) => {
        const s = get();
        const old = s.plan;
        if (!old || old.id === plan.id) {
          s.setPlan(plan);
          return plan;
        }
        const planLog = { ...s.planLog };
        const next: MealPlan = {
          ...plan,
          days: plan.days.map((d) => {
            const od = old.days.find((x) => x.date === d.date);
            if (!od) return d;
            return {
              ...d,
              meals: d.meals.map((m, i) => {
                const j = od.meals.findIndex(
                  (om, k) => om.label === m.label && planLog[planMealKey(old.id, od.date, k)]
                );
                if (j === -1) return m;
                planLog[planMealKey(plan.id, d.date, i)] = planLog[planMealKey(old.id, od.date, j)];
                return od.meals[j];
              }),
            };
          }),
        };
        // still the same stretch of days: what was bought stays bought
        let checked = s.checked;
        if (old.days.some((d) => d.date >= dayKey())) {
          const from = `plan:${old.id}:`;
          checked = { ...s.checked };
          for (const [k, v] of Object.entries(s.checked)) {
            if (v && k.startsWith(from)) checked[`plan:${plan.id}:${k.slice(from.length)}`] = true;
          }
        }
        set({ planLog, checked });
        get().setPlan(next);
        return next;
      },

      removePastPlan: (id) => set((s) => ({ pastPlans: s.pastPlans.filter((p) => p.id !== id) })),

      setPlanPrefs: (p) => set((s) => ({ planPrefs: { ...s.planPrefs, ...p } })),

      markPlanMeal: (key, mealId) => set((s) => ({ planLog: { ...s.planLog, [key]: mealId } })),

      pushRecentFood: (f) =>
        set((s) => ({
          recentFoods: [f, ...s.recentFoods.filter((x) => x.id !== f.id)].slice(0, 8),
        })),

      clearChat: () => set({ messages: [], logged: {}, checked: {}, fresh: {} }),

      seedDemoWeek: () => {
        const { profile } = get();
        const target = profile?.targets.kcal ?? 2000;
        const demo: Meal[] = [];
        const water: Record<string, number> = { ...get().water };
        const pattern = [0.92, 1.08, 0.86, 0.97, 1.12, 0.9];
        pattern.forEach((ratio, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const kcal = target * ratio;
          const split: [MealDraft['label'], number, number, string, string][] = [
            ['Colazione', 0.22, 8, '🥣', 'Yogurt greco e granola'],
            ['Pranzo', 0.38, 13, '🥗', 'Bowl di quinoa e pollo'],
            ['Cena', 0.4, 20, '🍝', 'Pasta al pomodoro e verdure'],
          ];
          split.forEach(([label, share, hour, emoji, title]) => {
            const at = new Date(d);
            at.setHours(hour, 15, 0, 0);
            const k = Math.round(kcal * share);
            demo.push({
              id: uid(),
              at: at.toISOString(),
              source: 'chat',
              label,
              emoji,
              title,
              items: [
                {
                  name: title,
                  emoji,
                  qty: '1 porzione',
                  kcal: k,
                  protein: Math.round((k * 0.24) / 4),
                  carbs: Math.round((k * 0.48) / 4),
                  fat: Math.round((k * 0.28) / 9),
                },
              ],
            });
          });
          water[dayKey(d)] = 1500 + ((i * 250) % 1000);
        });
        set((s) => ({
          meals: [...s.meals.filter((m) => dayKey(m.at) === dayKey()), ...demo],
          water,
        }));
      },

      resetAll: () =>
        set({
          memoryOn: true,
          memories: [],
          shortcuts: [],
          plan: null,
          pastPlans: [],
          planPrefs: { kind: 'week', focus: 'balanced' },
          planLog: {},
          recentFoods: [],
          lastBrief: null,
          profile: null,
          onboardingDraft: null,
          meals: [],
          water: {},
          messages: [],
          logged: {},
          checked: {},
          fresh: {},
        }),
    }),
    {
      name: 'nouri-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        profile: s.profile,
        onboardingDraft: s.onboardingDraft,
        meals: s.meals,
        water: s.water,
        logged: s.logged,
        checked: s.checked,
        speakReplies: s.speakReplies,
        lastBrief: s.lastBrief,
        memoryOn: s.memoryOn,
        memories: s.memories,
        shortcuts: s.shortcuts,
        plan: s.plan,
        pastPlans: s.pastPlans,
        planPrefs: s.planPrefs,
        planLog: s.planLog,
        recentFoods: s.recentFoods,
        // keep the chat light: large inline data-URIs (web photos) are dropped
        messages: s.messages
          .slice(-80)
          .map((m) =>
            m.imageUri && m.imageUri.startsWith('data:') && m.imageUri.length > 150_000
              ? { ...m, imageUri: undefined }
              : m
          ),
      }),
      onRehydrateStorage: () => () => {
        useNouri.setState({ hydrated: true });
      },
    }
  )
);
