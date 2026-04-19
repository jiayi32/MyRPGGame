import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import appCheck from '@react-native-firebase/app-check';

let initialized = false;

/**
 * Initializes Firebase for the client: App Check (debug in dev, Play Integrity in prod),
 * then Auth/Firestore/Functions pointed at emulators if EXPO_PUBLIC_FIREBASE_EMULATOR_HOST is set.
 *
 * Safe to call multiple times — subsequent calls are no-ops.
 *
 * TODO (P3): register Play Integrity app fingerprint in Firebase Console + Google Play Console
 * before first production Android build. See documentation/OPERATIONS.md.
 */
export async function initializeFirebase(): Promise<void> {
  if (initialized) return;

  const provider = appCheck().newReactNativeFirebaseAppCheckProvider();
  const debugToken = process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN;
  const android = __DEV__
    ? { provider: 'debug' as const, ...(debugToken ? { debugToken } : {}) }
    : { provider: 'playIntegrity' as const };
  provider.configure({ android });
  await appCheck().initializeAppCheck({
    provider,
    isTokenAutoRefreshEnabled: true,
  });

  const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
  if (__DEV__ && emulatorHost) {
    auth().useEmulator(`http://${emulatorHost}:9099`);
    firestore().useEmulator(emulatorHost, 8080);
    functions().useEmulator(emulatorHost, 5001);
  }

  initialized = true;
}

export { firebase, auth, firestore, functions };
