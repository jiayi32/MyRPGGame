import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { httpsCallable } from '@react-native-firebase/functions';
import { getApp, getAuth, getFunctions, initializeFirebase } from '@/services/firebase';
import { signInAnonymously, signOut, type AuthUser } from '@/services/auth';

type Status = 'loading' | 'ready' | 'error';

export function PlaceholderScreen() {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [helloResponse, setHelloResponse] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        await initializeFirebase();
      } catch (err) {
        setErrorMsg(`[init] ${err instanceof Error ? err.message : String(err)}`);
        setStatus('error');
        return;
      }

      try {
        const u = await signInAnonymously();
        setUser(u);
      } catch (err) {
        setErrorMsg(`[auth] ${err instanceof Error ? err.message : String(err)}`);
        setStatus('error');
        return;
      }

      const callHelloWorld = async (): Promise<string> => {
        const callable = httpsCallable(getFunctions(), 'helloWorld');
        const result = await callable({});
        return JSON.stringify(result.data);
      };

      const asRecord = (value: unknown): Record<string, unknown> =>
        typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

      const callHelloWorldViaFetch = async (): Promise<string> => {
        const authUser = getAuth().currentUser;
        if (!authUser) {
          throw new Error('unauthenticated: Missing auth user for helloWorld fetch fallback.');
        }

        const projectId = getApp().options.projectId;
        if (!projectId) {
          throw new Error('invalid-argument: Missing Firebase projectId.');
        }

        const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
        const endpoint =
          __DEV__ && emulatorHost
            ? `http://${emulatorHost}:5001/${projectId}/us-central1/helloWorld`
            : `https://us-central1-${projectId}.cloudfunctions.net/helloWorld`;

        const idToken = await authUser.getIdToken(true);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: {} }),
        });

        const raw = (await response.json().catch(() => ({}))) as unknown;
        const payload = asRecord(raw);
        const errorObj = asRecord(payload['error']);
        if (!response.ok || Object.keys(errorObj).length > 0) {
          const status =
            typeof errorObj['status'] === 'string' ? errorObj['status'] : `HTTP_${response.status}`;
          const message =
            typeof errorObj['message'] === 'string'
              ? errorObj['message']
              : 'helloWorld fetch fallback failed.';
          throw new Error(`${status}: ${message}`);
        }

        return JSON.stringify(payload['result']);
      };

      const isUnauthenticatedError = (error: unknown): boolean => {
        if (typeof error === 'object' && error !== null) {
          const maybe = error as { code?: unknown; message?: unknown };
          const code = typeof maybe.code === 'string' ? maybe.code : '';
          const message = typeof maybe.message === 'string' ? maybe.message : '';
          return /unauthenticated/i.test(code) || /unauthenticated/i.test(message);
        }
        return /unauthenticated/i.test(String(error));
      };

      try {
        setHelloResponse(await callHelloWorld());
        setStatus('ready');
      } catch (err) {
        if (isUnauthenticatedError(err)) {
          try {
            await signOut();
            const refreshedUser = await signInAnonymously();
            setUser(refreshedUser);
            setHelloResponse(await callHelloWorldViaFetch());
            setStatus('ready');
            return;
          } catch (retryErr) {
            setErrorMsg(
              `[helloWorld] ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`,
            );
            setStatus('error');
            return;
          }
        }

        setErrorMsg(`[helloWorld] ${err instanceof Error ? err.message : String(err)}`);
        setStatus('error');
      }
    };
    run().catch(() => undefined);
  }, []);

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <Text style={styles.label}>Initializing Firebase…</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Initialization failed</Text>
        <Text style={styles.error}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MyRPGGame — P0 scaffold</Text>
      <Text style={styles.label}>uid: {user?.uid}</Text>
      <Text style={styles.label}>helloWorld: {helloResponse}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '600' },
  label: { fontSize: 14, color: '#333' },
  error: { fontSize: 13, color: '#c00', textAlign: 'center' },
});
