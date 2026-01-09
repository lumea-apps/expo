# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## TODO: Rename Package

> **This is the official Lumea Expo template.** After cloning, rename the package in `package.json` from `"lumea-expo-app"` to your project name and remove this section.
>
> ```bash
> # Example: rename to "my-awesome-app"
> # 1. Edit package.json: "name": "my-awesome-app"
> # 2. Edit app.json: "name", "slug", "scheme"
> # 3. Delete this TODO section from CLAUDE.md
> ```

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

### Routing Structure

- `app/` - Expo Router file-based routing (similar to Next.js)
- `app/(tabs)/` - Tab group containing the main tab navigation
- `app/_layout.tsx` - Root layout (fonts, themes, splash screen)
- `app/+html.tsx` - Web-only HTML template with NativeWind CSS import
- `app/modal.tsx` - Modal presented over tabs

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

### Icons with Lucide

This project uses **Lucide React Native** for icons:

```tsx
import { Home, Settings, User } from 'lucide-react-native';

<Home size={24} color="#000" />
<Settings size={24} color="#666" />
<User size={24} color="#333" />
```

### Key Configuration

- **TypeScript**: Path aliases `@/*` and `~/*` map to project root
- **app.json**:
  - `newArchEnabled: true` - React Native New Architecture
  - `experiments.typedRoutes: true` - TypeScript route types
  - `experiments.tsconfigPaths: true` - Metro resolves tsconfig paths
  - `platforms: ["ios", "android", "web"]` - All platforms enabled
  - `userInterfaceStyle: "automatic"` - System theme follows device
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
