import { Button, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { useCombatStore, useRunStore } from '@/stores';

type Props = NativeStackScreenProps<RootStackParamList, 'Battle'>;

export function BattleScreen({ navigation }: Props) {
  const runId = useRunStore((state) => state.runId);
  const seed = useRunStore((state) => state.seed);
  const stage = useRunStore((state) => state.stage);
  const activeClassId = useRunStore((state) => state.activeClassId);
  const runStatus = useRunStore((state) => state.status);
  const runError = useRunStore((state) => state.error);
  const submitStageOutcome = useRunStore((state) => state.submitStageOutcome);

  const combatStatus = useCombatStore((state) => state.status);
  const combatError = useCombatStore((state) => state.error);
  const report = useCombatStore((state) => state.report);
  const simulateStage = useCombatStore((state) => state.simulateStage);
  const clearCombat = useCombatStore((state) => state.clear);

  useEffect(() => {
    if (runId === null) {
      navigation.replace('Hub');
    }
  }, [navigation, runId]);

  const canSimulate =
    runId !== null &&
    seed !== null &&
    stage !== null &&
    activeClassId !== null &&
    combatStatus !== 'simulating' &&
    runStatus !== 'submitting_outcome';

  const handleSimulateAndSubmit = async () => {
    if (seed === null || stage === null || activeClassId === null) {
      return;
    }

    try {
      const nextReport = await simulateStage({
        seed,
        stageIndex: stage,
        activeClassId,
      });

      await submitStageOutcome({
        stageIndex: nextReport.stageIndex,
        result: nextReport.outcomeResult,
        rewards: nextReport.claimedRewards,
        hpRemaining: nextReport.hpRemaining,
        elapsedSeconds: nextReport.elapsedSeconds,
      });

      navigation.navigate('RewardResolution');
    } catch {
      // Error states are surfaced by the stores.
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Battle Simulation</Text>
      <Text style={styles.caption}>MVP procedural stage autoplay + submitStageOutcome</Text>

      <View style={styles.card}>
        <Text style={styles.row}>Run ID: {runId ?? 'none'}</Text>
        <Text style={styles.row}>Seed: {seed ?? 'n/a'}</Text>
        <Text style={styles.row}>Stage: {stage ?? 'n/a'}</Text>
        <Text style={styles.row}>Class: {activeClassId ?? 'n/a'}</Text>
        <Text style={styles.row}>Run Status: {runStatus}</Text>
        <Text style={styles.row}>Combat Status: {combatStatus}</Text>
      </View>

      {runError !== null ? <Text style={styles.error}>{runError}</Text> : null}
      {combatError !== null ? <Text style={styles.error}>{combatError}</Text> : null}

      {report !== null ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Latest Simulation</Text>
          <Text style={styles.row}>Encounter: {report.encounterId}</Text>
          <Text style={styles.row}>Battle Result: {report.battleResult}</Text>
          <Text style={styles.row}>Outcome Sent: {report.outcomeResult}</Text>
          <Text style={styles.row}>HP Remaining: {report.hpRemaining}</Text>
          <Text style={styles.row}>Elapsed Seconds: {report.elapsedSeconds}</Text>
          <Text style={styles.row}>Ticks: {report.tickCount}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          title="Simulate Stage + Submit Outcome"
          onPress={() => {
            handleSimulateAndSubmit().catch(() => undefined);
          }}
          disabled={!canSimulate}
        />
      </View>

      <View style={styles.actions}>
        <Button
          title="Clear Simulation Report"
          onPress={clearCombat}
          disabled={combatStatus === 'simulating'}
        />
      </View>

      <View style={styles.actions}>
        <Button title="Back to Hub" onPress={() => navigation.replace('Hub')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 14,
    backgroundColor: '#f6f6fa',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e2238',
  },
  caption: {
    fontSize: 13,
    color: '#4f5678',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cfd3e9',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2a315b',
  },
  row: {
    fontSize: 14,
    color: '#30344f',
  },
  actions: {
    gap: 8,
  },
  error: {
    fontSize: 13,
    color: '#a10f0f',
  },
});
