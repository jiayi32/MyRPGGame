import { useEffect } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/AppNavigator';
import { usePlayerStore, useRunStore } from '@/stores';
import { useCombatStore } from '@/stores/combatStore';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';
import { useGearInventory } from '@/hooks/useGearInventory';

export function HubScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  const runStatus = useRunStore((state) => state.status);
  const runError = useRunStore((state) => state.error);
  const runId = useRunStore((state) => state.runId);
  const stage = useRunStore((state) => state.stage);
  const bootstrap = useRunStore((state) => state.bootstrap);
  const endRunAction = useRunStore((state) => state.endRun);

  const playerStatus = usePlayerStore((state) => state.status);
  const uid = usePlayerStore((state) => state.uid);
  const playerError = usePlayerStore((state) => state.error);

  const clearCombat = useCombatStore((state) => state.clear);
  const { instances: gearInstances } = useGearInventory();

  useEffect(() => {
    bootstrap().catch(() => undefined);
  }, [bootstrap]);

  const isLoading =
    runStatus === 'initializing' ||
    runStatus === 'starting_run';

  const hasActiveRun = runId !== null && runStatus === 'run_active';
  const hasUnequippedGear = hasActiveRun && gearInstances.some((i) => !i.equipped);

  const handleStartNew = () => {
    clearCombat();
    navigation.navigate('ClassSelect');
  };

  const handleResume = () => {
    navigation.navigate('Battle');
  };

  const handleForfeit = (): void => {
    Alert.alert('Forfeit Run?', 'End this run as fled. Banked rewards persist; vault is forfeited.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Forfeit',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await endRunAction('fled');
            } catch {
              // surfaced by run store
            }
          })();
        },
      },
    ]);
  };

  const error = runError ?? playerError;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MyRPGGame</Text>
      <Text style={styles.subtitle}>Firebase vertical slice</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Player</Text>
        <Text style={styles.value}>{uid ?? 'Signing in…'}</Text>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{playerStatus}</Text>
      </View>

      {hasActiveRun && (
        <View style={styles.runCard}>
          <Text style={styles.runLabel}>Active Run — Stage {stage ?? '?'}</Text>
          <Text style={styles.runId}>{runId}</Text>
          {hasUnequippedGear && (
            <Text style={styles.gearNudge}>⚠ You have unequipped gear — check the Equipment tab before heading back.
            </Text>
          )}
          <TouchableOpacity onPress={handleForfeit} style={styles.forfeitLink}>
            <Text style={styles.forfeitLinkText}>Forfeit Run</Text>
          </TouchableOpacity>
        </View>
      )}

      {error !== null ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        {hasActiveRun ? (
          <PrimaryButton title="Resume Run" variant="secondary" onPress={handleResume} />
        ) : (
          <PrimaryButton
            title="Start New Run"
            onPress={handleStartNew}
            disabled={isLoading || playerStatus !== 'ready'}
            busy={isLoading}
          />
        )}
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
    gap: 4,
  },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: '#7b684a',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 14,
    color: '#2d2d2d',
    marginBottom: 6,
  },
  runCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b7c9a0',
    backgroundColor: '#f2f8ec',
    gap: 4,
  },
  runLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2a4a1a',
  },
  runId: {
    fontSize: 11,
    color: '#5a7a4a',
  },
  forfeitLink: { alignSelf: 'flex-start', marginTop: 4 },
  forfeitLinkText: { fontSize: 11, color: '#a04040', textDecorationLine: 'underline' },
  gearNudge: { fontSize: 12, color: '#8b5a00', fontStyle: 'italic' },
  actions: {
    gap: 8,
  },
  error: {
    fontSize: 13,
    color: '#a10f0f',
  },
});
