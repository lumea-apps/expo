# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
bun install

# Start development server (opens interactive menu for platform selection)
bun start

# Platform-specific development
bun run ios       # Run on iOS simulator
bun run android   # Run on Android emulator
bun run web       # Run in web browser
```

## Architecture Overview

This is an **Expo SDK 54** project using **Expo Router** for file-based routing, **React 19**, and **React Native 0.81** with the New Architecture enabled.

### App: Nouri — conversational AI nutrition assistant

The whole product is a conversation; data screens are secondary. See `README.md` for the product/design overview.

- `app/index.tsx` - Chat home (redirects to `/onboarding` until a profile exists)
- `app/onboarding.tsx` - Conversational onboarding (name → goal → diet → avoid → weight → activity → targets reveal)
- `app/today.tsx` - "Oggi" modal: rings, macro bars, water, meal timeline
- `app/profile.tsx` - Profile, AI engine status, demo/reset actions
- `app/voice.tsx` - Voice mode (Web Speech API on web, keyboard dictation on native, TTS via `expo-speech`)
- `app/search.tsx` - Quick nutrition search: built-in foods instantly, Open Food Facts products by name or barcode (`components/food/BarcodeScanner.tsx`, stubbed on web)
- `app/memory.tsx` - Memory: on/off switch, shortcuts, liked/disliked foods, habits
- `app/meal-plan.tsx` - Daily or weekly meal plan: create (day/tomorrow/week × focus), mark eaten, swap a dish, grocery list
- `app/_layout.tsx` - Root layout (Geist fonts, light theme, splash, stack/modals)

Key modules:

- `lib/ai/` - The "brain". `askNouri()` first tries `quickRespond()` (shortcuts, always local and instant), then uses Claude (`claude.ts`, structured outputs → widgets) when `EXPO_PUBLIC_NOURI_API_URL` or `EXPO_PUBLIC_ANTHROPIC_API_KEY` is set, otherwise the offline Italian intent engine (`local.ts`). Both return `{ text, widgets, suggestions, waterMl, profilePatch, memory, autoLog }`; `lib/useSend.ts` builds the context (`brainContext()`), applies water, plan changes (`applyProfilePatch` in `lib/nutrition.ts`) and memory changes (`applyMemory`), adds the `targets`/`memory` cards, makes a new `meal_plan` the active plan and auto-logs shortcuts. `dailyBrief()` in `local.ts` posts the first message of each new day.
- `lib/types.ts` - `Widget` union = the generative-UI contract. Adding a widget means: type here → schema in `lib/ai/claude.ts` → card in `components/widgets/` → case in `components/widgets/index.tsx`.
- `lib/store.ts` - Zustand store persisted with AsyncStorage (profile, meals, water, chat).
- `lib/foods.ts`, `lib/recipes.ts` - Food table + recipe catalogue used by the offline brain and the meal planner.
- `lib/memory.ts` - Parses memory requests ("odio i funghi", "salvalo come colazione solita"), matches shortcuts, and checks dishes against likes/dislikes. Memory is only passed to the brains when `memoryOn` is true; shortcuts always work.
- `lib/mealplan.ts` - `generatePlan()` (4 slots/day sized to targets, diet/avoid/dislikes respected, variety across the week), `swapPlannedMeal()`, `planGrocery()`.
- `lib/foodfacts.ts` (pure) and `lib/foodsearch.ts` (Open Food Facts; native uses search.openfoodfacts.org, web uses the CORS-enabled `cgi/search.pl`).
- `constants/theme.ts` - Design tokens (colors per macro, fonts, radii). Use these instead of hard-coded values.
- `components/ui/` - Orb, Glass/Card/Chip/buttons, rings, typography (`Display`/`Sans`/`Mono`, all Geist; `Mono` = tabular figures).

Routes are automatically typed via `expo-router` typed routes experiment.

### Styling with NativeWind

This project uses **NativeWind v4** (Tailwind CSS for React Native):

- `global.css` - Tailwind directives (@tailwind base/components/utilities)
- `tailwind.config.js` - Tailwind configuration with NativeWind preset
- `babel.config.js` - Babel preset configured with `jsxImportSource: 'nativewind'`
- `metro.config.js` - Metro wrapped with `withNativeWind`
- `app/+html.tsx` - Imports `global.css` for web support

**Usage:**
```tsx
import { View, Text } from 'react-native';

export default function MyComponent() {
  return (
    <View className="flex-1 bg-white dark:bg-black p-4">
      <Text className="text-lg font-bold text-gray-900 dark:text-white">
        Hello NativeWind!
      </Text>
    </View>
  );
}
```

### Icons: Solar

Icons come from the **Solar** set (480 Design, CC BY 4.0). Only the icons the app uses are
extracted into `components/ui/solar-icons.ts` by `scripts/build-icons.mjs` (source:
`@iconify-json/solar`, dev dependency). To add one, put its name in the script and run `bun run icons`.

```tsx
import { Icon, IconTile } from '@/components/ui/Icon';

<Icon name="add-linear" size={22} />                 // controls: -linear / -bold
<IconTile name="scale-bold-duotone" tint="blue" />   // lists and menus: -bold-duotone on a tint
```

Domain → icon mapping (goals, diets, activity) lives in `constants/icons.ts`. Menus use
`components/ui/Menu.tsx` (`MenuGroup`, `MenuRow`, `ActionTiles`) and `components/ui/Sheet.tsx`
(`SheetProvider` + `useSheet().open(...)`, rendered inside the screen so it also works above native modals).

### Key Configuration

- **TypeScript**: Path aliases `@/*` and `~/*` map to project root
- **app.json**:
  - `newArchEnabled: true` - React Native New Architecture
  - `experiments.typedRoutes: true` - TypeScript route types
  - `experiments.tsconfigPaths: true` - Metro resolves tsconfig paths
  - `platforms: ["ios", "android", "web"]` - All platforms enabled
  - `userInterfaceStyle: "light"` - The app is light-only by design (white, hairline borders, black accents)
- **babel.config.js**: `unstable_transformImportMeta: true` is required — zustand's ESM middleware uses `import.meta`, which otherwise breaks the web bundle
- **metro.config.js**: `maxWorkers` is set to 2 - **DO NOT MODIFY** this value, it's intentionally limited for system stability

### Web Support

Web is fully supported with Metro bundler:
- `app/+html.tsx` - Custom HTML template with NativeWind CSS
- `web.bundler: "metro"` - Uses Metro for web bundling
- `web.output: "single"` - Single-page app mode (required for NativeWind v4 compatibility)

> **Note:** `"static"` output is not compatible with NativeWind v4's JSX runtime in Node.js static rendering.

### Template Generated With

```bash
npx rn-new@latest my-expo-app --expo-router --tabs --nativewind --bun
```

This ensures proper NativeWind v4 configuration with jsxImportSource for optimal compatibility.
