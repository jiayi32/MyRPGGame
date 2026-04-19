import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import functions from '@react-native-firebase/functions';
import { initializeFirebase } from '@/services/firebase';
import { signInAnonymously, type AuthUser } from '@/services/auth';

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
        const u = await signInAnonymously();
        setUser(u);

        const callable = functions().httpsCallable('helloWorld');
        const result = await callable({});
        setHelloResponse(JSON.stringify(result.data));
        setStatus('ready');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
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
