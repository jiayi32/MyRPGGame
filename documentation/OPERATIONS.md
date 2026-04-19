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

## Pointing the app at the emulators

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

## Deploying a function to the emulator

```bash
npm run fn:build
# emulators terminal picks up lib/ changes automatically
```

To deploy to real Firebase (later, when a project exists):

```bash
firebase deploy --only functions --project <alias>
```

---

## Production App Check (Android)

Play Integrity requires:
1. App signing fingerprint registered in Firebase Console → Project Settings → your Android app → SHA fingerprints.
2. Google Play Console linked to the Firebase project.
3. Play Integrity API enabled in Google Cloud Console for the linked project.

iOS App Check (DeviceCheck / App Attest) is deferred until iOS is scaffolded.
