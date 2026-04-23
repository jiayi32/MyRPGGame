import { Button, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { useCombatStore, useRunStore } from '@/stores';

const RewardBlock = ({
  title,
  rewards,
}: {
  title: string;
  rewards: {
    gold: number;
    ascensionCells: number;
    xpScrollMinor: number;
    xpScrollStandard: number;
    xpScrollGrand: number;
    gearIds: string[];
  };
}) => (
  <View style={styles.rewardCard}>
    <Text style={styles.rewardTitle}>{title}</Text>
    <Text style={styles.row}>Gold: {rewards.gold}</Text>
    <Text style={styles.row}>Ascension Cells: {rewards.ascensionCells}</Text>
    <Text style={styles.row}>XP Scroll Minor: {rewards.xpScrollMinor}</Text>
    <Text style={styles.row}>XP Scroll Standard: {rewards.xpScrollStandard}</Text>
    <Text style={styles.row}>XP Scroll Grand: {rewards.xpScrollGrand}</Text>
    <Text style={styles.row}>Gear IDs: {rewards.gearIds.length > 0 ? rewards.gearIds.join(', ') : 'None'}</Text>
  </View>
);

type Props = NativeStackScreenProps<RootStackParamList, 'RewardResolution'>;

export function RewardResolutionScreen({ navigation }: Props) {
  const runId = useRunStore((state) => state.runId);
  const stage = useRunStore((state) => state.stage);
  const runResult = useRunStore((state) => state.runResult);
  const runStatus = useRunStore((state) => state.status);
  const runError = useRunStore((state) => state.error);
  const bankedRewards = useRunStore((state) => state.bankedRewards);
  const vaultedRewards = useRunStore((state) => state.vaultedRewards);
  const endRun = useRunStore((state) => state.endRun);
  const resetRun = useRunStore((state) => state.resetRun);

  const report = useCombatStore((state) => state.report);
  const clearCombat = useCombatStore((state) => state.clear);

  const canEndRun = runId !== null && runStatus !== 'ending_run' && runResult === 'ongoing';

  const handleEndRun = async () => {
    if (!canEndRun) return;

    const finalResult = report?.outcomeResult ?? 'fled';
    try {
      await endRun(finalResult);
    } catch {
      // Error is surfaced by run store.
    }
  };

  const handlePlayAgain = () => {
    clearCombat();
    resetRun();
    navigation.replace('Hub');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reward Resolution</Text>
      <Text style={styles.caption}>Server-committed reward ledger from current run snapshot</Text>

      <View style={styles.card}>
        <Text style={styles.row}>Run ID: {runId ?? 'none'}</Text>
        <Text style={styles.row}>Current Stage: {stage ?? 'n/a'}</Text>
        <Text style={styles.row}>Run Status: {runStatus}</Text>
        <Text style={styles.row}>Run Result: {runResult ?? 'n/a'}</Text>
        <Text style={styles.row}>Last Battle Result: {report?.battleResult ?? 'n/a'}</Text>
      </View>

      <RewardBlock title="Banked Rewards" rewards={bankedRewards} />
      <RewardBlock title="Vaulted Rewards" rewards={vaultedRewards} />

      {runError !== null ? <Text style={styles.error}>{runError}</Text> : null}

      <View style={styles.actions}>
        <Button
          title="End Run"
          onPress={() => {
            handleEndRun().catch(() => undefined);
          }}
          disabled={!canEndRun}
        />
      </View>

      <View style={styles.actions}>
        <Button title="Play Again" onPress={handlePlayAgain} />
      </View>

      <View style={styles.actions}>
        <Button title="Back to Battle" onPress={() => navigation.replace('Battle')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    backgroundColor: '#eff5f1',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#12372a',
  },
  caption: {
    fontSize: 13,
    color: '#36564a',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b7d0c2',
    backgroundColor: '#fcfffd',
    padding: 14,
    gap: 6,
  },
  rewardCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c5dbcf',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 4,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1d4f3c',
  },
  row: {
    fontSize: 14,
    color: '#2f3f39',
  },
  actions: {
    gap: 8,
  },
  error: {
    fontSize: 13,
    color: '#a10f0f',
  },
});
