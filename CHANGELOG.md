# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-04-20

### Added — P0 scaffold

- React Native + TypeScript + Expo SDK 55 project shape with strict `tsconfig` (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`) and `@/*` path alias.
- Firebase client wiring via `@react-native-firebase/*` (app, auth, firestore, functions, app-check). App Check: debug provider in `__DEV__`, Play Integrity in production Android; iOS deferred.
- `src/` skeleton: `components/`, `content/`, `domain/`, `features/`, `hooks/`, `navigation/`, `screens/`, `services/`, `stores/`.
- Navigation stub: [App.tsx](App.tsx) → [src/navigation/AppNavigator.tsx](src/navigation/AppNavigator.tsx) → [src/screens/PlaceholderScreen.tsx](src/screens/PlaceholderScreen.tsx) (anon sign-in + `helloWorld` callable smoke test).
- Cloud Functions project at [firebase/functions/](firebase/functions/) with `helloWorld` HTTPS callable (v2).
- Firebase root config: [firebase.json](firebase.json), [.firebaserc](.firebaserc), minimal deny-all [firebase/firestore.rules](firebase/firestore.rules), empty [firebase/firestore.indexes.json](firebase/firestore.indexes.json).
- Tooling: Jest (`jest-expo` preset), ESLint 9 flat config via `eslint-config-universe/flat/*`, Prettier, Reanimated babel plugin, Metro config.
- `.env.example` with `EXPO_PUBLIC_FIREBASE_*` placeholders + emulator host override.
- Smoke test [src/__tests__/smoke.test.ts](src/__tests__/smoke.test.ts).
- Operations runbook [documentation/OPERATIONS.md](documentation/OPERATIONS.md).

### Changed — Documentation

- Renamed Dream Ocean archetype "Beast" → "Spirit" across [INTEGRATION_REPORT.md](documentation/INTEGRATION_REPORT.md), [ClassDesignDeepResearch.md](documentation/New/ClassDesignDeepResearch.md), [DeepResearch2.md](documentation/New/DeepResearch2.md), [DeepResearch3.md](documentation/New/DeepResearch3.md). In-world names (Beast Bite, Beast's Instinct, etc.) preserved.
- §3 lineage mapping locked: Tide Shell → Rift, Arrow Creed → Tempest, Dream Ocean → Spirit. G1 marked Resolved.
- Architecture revised to **client-authoritative combat with server-issued seeds**; Firebase stores outcomes only, no battle logs. Supersedes [INTEGRATION_REPORT.md §4](documentation/INTEGRATION_REPORT.md) (rewrite tracked as follow-up).

### Added — Content docs

- [documentation/New/EnemyDesign.md](documentation/New/EnemyDesign.md): 12 parameterized enemy archetypes (stat_wall, speed_pressure, sustain_denial, dps_race, ct_manipulator, summoner, nullshield, chaos_dps, oracle, engineer, harrier, resonator) with 4-tier scaling tables and TypeScript schema. Closes G2.

### Notes

- `App.js` removed; [App.tsx](App.tsx) is the sole root (resolved via [index.js](index.js)).
- ESLint bumped 8 → 9 to satisfy `eslint-config-universe@14` peer requirement.
- `ignoreDeprecations` removed from both tsconfigs — TS 5.9 rejects the value.
