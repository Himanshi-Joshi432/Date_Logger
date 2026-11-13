This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- This app does **not** use Expo Router. It uses **React Navigation** (native stack) set up in `App.js`:
  - `Main` holds the four bottom tabs (journal, memories, log, bucket list). Tabs are switched with local state inside `MainTabs` and the custom `src/components/BottomNavBar.js`, and stay mounted underneath pushed screens.
  - `Details` and `Settings` are pushed on the stack (native transitions and swipe-back). `Auth` replaces everything when signed out.
  - To go back to a screen already in the stack use `StackActions.popTo`, not `navigate` (v7 pushes a new copy).
  - Deep links: `datelogger://memory/<id>` and `datelogger://settings`.
- Screens take plain callback props (`onNavigateBack`, `onViewDetails`, ...); only `App.js` touches the navigation object. Screens that must refresh when returned to use `useFocusEffect`.
- Shared code: `src/components/` (`motion.js` animation kit, `MusicSearchModal`, `EditMemoryModal`, `MemoryFields`), `src/hooks/` (`useAudioPreview`), `src/services/` (API, music, notifications, image resizing), `src/utils/`, `src/theme/`.
- Animations must go through `src/components/motion.js`, which honours the system Reduce Motion setting.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
