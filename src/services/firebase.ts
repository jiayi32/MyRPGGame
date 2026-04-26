import { getApp } from '@react-native-firebase/app';
import { getAuth, connectAuthEmulator } from '@react-native-firebase/auth';
import { getFirestore, connectFirestoreEmulator } from '@react-native-firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from '@react-native-firebase/functions';

// App Check is intentionally deferred to the launch-prep stage (see plan Stage 7).
// Re-enabling now requires registering a debug token in Firebase Console for every
// dev device, which adds friction during pre-launch iteration. When re-enabling:
//   1. Run the app, capture the debug token via `adb logcat | grep -i "app check"`.
//   2. Register it at Firebase Console → App Check → Apps → Manage debug tokens.
//   3. Set EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN in .env.
//   4. Restore initializeAppCheck via @react-native-firebase/app-check.
//   5. Flip `enforceAppCheck: true` on every callable in firebase/functions/src/*.

let initialized = false;

/**
 * Initializes Firebase for the client.
 * App Check is deferred to launch-prep — see comment above.
 * Auth/Firestore/Functions are pointed at emulators if EXPO_PUBLIC_FIREBASE_EMULATOR_HOST is set.
 *
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initializeFirebase(): Promise<void> {
  if (initialized) return;

  const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
  const useEmulators = __DEV__ && !!emulatorHost;

  if (__DEV__) {
    const projectId = getApp().options.projectId ?? '<missing>';
    console.log(
      `[Firebase] projectId=${projectId} target=${useEmulators ? `emulator (${emulatorHost})` : 'production'} appCheck=deferred`,
    );
    if (!useEmulators) {
      console.log(
        '[Firebase] HINT: production target — every callable must be deployed via `firebase deploy --only functions`. To target the emulator instead, set EXPO_PUBLIC_FIREBASE_EMULATOR_HOST in .env (Android emulator: 10.0.2.2; iOS sim/web: localhost; physical device: your LAN IP) and restart Metro.',
      );
    }
  }

  if (useEmulators) {
    connectAuthEmulator(getAuth(), `http://${emulatorHost}:9099`);
    connectFirestoreEmulator(getFirestore(), emulatorHost, 8080);
    connectFunctionsEmulator(getFunctions(), emulatorHost, 5001);
  }

  initialized = true;
}

export { getApp, getAuth, getFirestore, getFunctions };
