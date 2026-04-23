import { useEffect } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { useCombatStore, useRunStore } from '@/stores';

const MVP_ACTIVE_CLASS_ID = 'drakehorn_forge.ember_initiate' as const;

type Props = NativeStackScreenProps<RootStackParamList, 'Hub'>;

export function HubScreen({ navigation }: Props) {
  const status = useRunStore((state) => state.status);
  const error = useRunStore((state) => state.error);
  const userId = useRunStore((state) => state.userId);
  const runId = useRunStore((state) => state.runId);
  const bootstrap = useRunStore((state) => state.bootstrap);
  const startRun = useRunStore((state) => state.startRun);
  const clearCombat = useCombatStore((state) => state.clear);

  useEffect(() => {
    bootstrap().catch(() => undefined);
  }, [bootstrap]);

  const startDisabled =
    status === 'initializing' ||
    status === 'starting_run' ||
    status === 'submitting_outcome' ||
    status === 'ending_run';

  const handleStartRun = async () => {
    try {
      clearCombat();
      await startRun(MVP_ACTIVE_CLASS_ID);
      navigation.navigate('Battle');
    } catch {
      // Error state is managed by run store and rendered below.
    }
  };

  const resumeAvailable = runId !== null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MyRPGGame MVP</Text>
      <Text style={styles.subtitle}>Android emulator vertical slice</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Auth UID</Text>
        <Text style={styles.value}>{userId ?? 'Signing in...'}</Text>

        <Text style={styles.label}>Store Status</Text>
        <Text style={styles.value}>{status}</Text>

        <Text style={styles.label}>Run ID</Text>
        <Text style={styles.value}>{runId ?? 'No active run'}</Text>
      </View>

      {error !== null ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button
          title="Start Stage-1 Demo Run"
          onPress={() => {
            handleStartRun().catch(() => undefined);
          }}
          disabled={startDisabled}
        />
      </View>

      <View style={styles.actions}>
        <Button
          title="Resume Active Run"
          onPress={() => navigation.navigate('Battle')}
          disabled={!resumeAvailable}
        />
      </View>

      <View style={styles.actions}>
        <Button
          title="Diagnostics (helloWorld)"
          onPress={() => navigation.navigate('Placeholder')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    backgroundColor: '#f5f4ef',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2b1f10',
  },
  subtitle: {
    fontSize: 14,
    color: '#5d4d35',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
    gap: 6,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#7b684a',
  },
  value: {
    fontSize: 14,
    color: '#2d2d2d',
    marginBottom: 6,
  },
  actions: {
    gap: 8,
  },
  error: {
    fontSize: 13,
    color: '#a10f0f',
  },
});
