# Operations Runbook

Short operational reference for running the app and its Firebase backend locally. Update as the backend grows.

---

## Running the Firebase emulators

```bash
npm run emulators
```

Boots Auth (9099), Firestore (8080), Functions (5001), and the Emulator UI (4000). Keep this terminal open while developing against local Firebase.

Before the functions emulator can serve code, build once:

```bash
npm run fn:build
```

Rebuild whenever you edit `firebase/functions/src/*.ts`. The emulator auto-reloads the built output.

---

## Backend mode quick reference

| Desired target | `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` value | Requires emulators running? |
|---|---|---|
| **Production Firebase** | *(empty)* | No |
| Android emulator → local emulators | `10.0.2.2` | Yes — `npm run emulators` |
| iOS simulator → local emulators | `localhost` | Yes — `npm run emulators` |
| Physical device → local emulators | Your machine's LAN IP | Yes — `npm run emulators` |

> **Important:** after changing `.env`, fully restart Metro and relaunch the dev client so Expo re-bundles the new `EXPO_PUBLIC_*` values.

---

## Troubleshooting

### `auth/network-request-failed` on Android emulator

1. Check `.env` — if `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` is **non-empty**, the app routes auth to `<host>:9099`. If emulators are not running, every sign-in request fails.
   - **Want real Firebase?** Set `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=` (empty) and restart Metro.
   - **Want local emulators?** Run `npm run emulators` first, then relaunch the app.
2. After any `.env` change, restart the Metro bundler — stale bundles keep the old value.
3. Check logcat for the startup line: `[Firebase] target=production appCheck=debug` (or `emulator (10.0.2.2)`) to confirm which backend was resolved at runtime.

### Store status stuck at `initializing` / `error`

Bootstrap calls `initializeFirebase()` then `signInAnonymously()`. If either throws, the store lands in `error` and the Hub displays the raw error string. The error string now includes a hint:
- `auth/network-request-failed — emulator at 10.0.2.2:9099 unreachable; run: npm run emulators`
- `auth/network-request-failed — check internet connection`

### Diagnostics screen shows `[auth] …` prefix

The Diagnostics screen (Placeholder) reports errors with a phase prefix so you know exactly which step failed: `[init]`, `[auth]`, or `[helloWorld]`. A failure in `[auth]` means sign-in never completed; the `[helloWorld]` callable is not reached.

---


Set an env var in `.env` (copy from `.env.example`):

```
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=10.0.2.2
```

- Android emulator: `10.0.2.2` (host loopback).
- iOS simulator / web: `localhost`.
- Physical device on LAN: your machine's LAN IP.

When unset, the client talks to the real Firebase project configured in `.firebaserc`.

---

## App Check debug token (dev builds)

`@react-native-firebase/app-check` uses the debug provider when `__DEV__` is true. On first launch the token prints to logcat:

```
adb logcat | grep -i "app check"
```

Copy the UUID and register it in **Firebase Console → App Check → Apps → your Android app → Manage debug tokens**. Required for callables to succeed against real Firebase. Against the emulator, App Check enforcement is off by default.

---

## Adding a Firebase client env value

1. Add the key to `.env.example` with an empty placeholder.
2. Add to local `.env` with the real value (gitignored).
3. Read from `process.env.EXPO_PUBLIC_<NAME>` in `src/services/firebase.ts`. The `EXPO_PUBLIC_` prefix is required for the value to be bundled into the client.

---

## Deploying functions

### To the emulator (fast iteration)

```bash
npm run fn:build
# emulators terminal picks up lib/ changes automatically
```

### To production Firebase

```bash
npx firebase deploy --only functions --project myrpggame-c6f35
```

The `predeploy` hook in [firebase.json](../firebase.json) builds first; running `fn:build` beforehand is just for fast feedback. Deploy takes ~2–5 minutes and pushes every export from [firebase/functions/src/index.ts](../firebase/functions/src/index.ts):

- Callables: `helloWorld`, `getOrCreatePlayer`, `startRun`, `submitStageOutcome`, `bankCheckpoint`, `endRun`
- Background trigger: `auditRunCompletion`
- Dev callables (gated by `ALLOW_DEV_TOOLS` env or emulator runtime): `devSkipStage`, `devGrantAllClasses`, `devResetPlayer`, `devSetCurrencies`

After a successful deploy, the app's `getOrCreatePlayer` (and friends) work against the real Firebase project from any device — no emulator needed.

---

## Switching between production and emulator (alpha workflow)

The dev loop is much faster against the emulator (no deploy needed per change), but production lets you test on a phone away from your dev machine. The single switch is `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` in [.env](../.env).

### Going to emulator (Android emulator path)

```bash
# 1. Edit .env
echo "EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=10.0.2.2" > .env

# 2. Start emulators (separate terminal, leave running)
npm run emulators

# 3. Restart Metro fully (Ctrl+C, then `npm start`) so Expo re-bundles .env

# 4. Relaunch the dev client on the Android emulator
```

The startup logcat line will read `[Firebase] projectId=myrpggame-c6f35 target=emulator (10.0.2.2)`. Sign-in calls hit the local Auth emulator; callables hit the local Functions emulator with whatever the latest `npm run fn:build` produced.

### Going back to production

```bash
# 1. Clear the emulator host
echo "EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=" > .env

# 2. Restart Metro fully

# 3. Relaunch the dev client
```

Logcat will read `target=production`. Production Firebase Auth is independent of the emulator, so you'll need to either re-register the test account at production (Firebase Console → Authentication → Users) or use the email+password account already there.

> **Trap to watch for**: the functions emulator caches *function exports* at startup. If you start emulators, then add a new callable in `firebase/functions/src/`, the emulator's hot-reload will sometimes miss the new export. If `npm run fn:smoke` reports `Function us-central1-X does not exist`, restart the emulator with Ctrl+C → `npm run emulators`.

---

## Production App Check (Android)

Play Integrity requires:
1. App signing fingerprint registered in Firebase Console → Project Settings → your Android app → SHA fingerprints.
2. Google Play Console linked to the Firebase project.
3. Play Integrity API enabled in Google Cloud Console for the linked project.

iOS App Check (DeviceCheck / App Attest) is deferred until iOS is scaffolded.
