import { useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';
import { RewardBlock } from './RewardBlock';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/AppNavigator';
import type { ProgressionDelta } from '@/features/run/types';
import { CLASS_BY_ID } from '@/content';
import type { ClassId } from '@/content/types';
import { useCombatStore, useRunStore } from '@/stores';

type Props = NativeStackScreenProps<HomeStackParamList, 'RewardResolution'>;

export function RewardResolutionScreen({ navigation }: Props) {
  const runId = useRunStore((state) => state.runId);
  const stage = useRunStore((state) => state.stage);
  const runResult = useRunStore((state) => state.runResult);
  const runError = useRunStore((state) => state.error);
  const bankedRewards = useRunStore((state) => state.bankedRewards);
  const vaultedRewards = useRunStore((state) => state.vaultedRewards);
  const vaultStreak = useRunStore((state) => state.vaultStreak);
  const awaitingVaultDecision = useRunStore((state) => state.awaitingVaultDecision);
  const vaultAtStage = useRunStore((state) => state.vaultAtStage);
  const pressOn = useRunStore((state) => state.pressOn);
  const endRun = useRunStore((state) => state.endRun);
  const resetRun = useRunStore((state) => state.resetRun);

  const report = useCombatStore((state) => state.report);
  const autoPlay = useCombatStore((state) => state.autoPlay);
  const clearCombat = useCombatStore((state) => state.clear);

  const [progression, setProgression] = useState<ProgressionDelta | null>(null);
  const [settling, setSettling] = useState(false);
  const [vaulting, setVaulting] = useState(false);

  const completedStage = report?.stageIndex ?? stage;
  const rewardMultiplierApplied = Math.min(1 + Math.max(0, vaultStreak - 1) * 0.2, 3);
  const rewardMultiplierNext = Math.min(1 + vaultStreak * 0.2, 3);
  const multiplierAtCap = rewardMultiplierNext >= 3;

  const isRunEnded = runResult === 'won' || runResult === 'lost';
  const canEndRun = runId !== null && !settling && !isRunEnded;
  const finalResult = report?.outcomeResult ?? 'fled';

  // Auto-settle when autoPlay is on and battle ends without a pending vault decision.
  useEffect(() => {
    if (!autoPlay || !canEndRun || awaitingVaultDecision) return;
    setSettling(true);
    endRun(finalResult)
      .then((response) => setProgression(response.progression))
      .catch(() => undefined)
      .finally(() => setSettling(false));
  }, [autoPlay, canEndRun, awaitingVaultDecision, finalResult, endRun]);

  useFocusEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  });

  const handleEndRun = async () => {
    if (!canEndRun) return;
    setSettling(true);
    try {
      const response = await endRun(finalResult);
      setProgression(response.progression);
    } catch {
      // Error is surfaced by run store.
    } finally {
      setSettling(false);
    }
  };

  const handlePlayAgain = () => {
    clearCombat();
    resetRun();
    setProgression(null);
    navigation.replace('Hub');
  };

  const handleVaultNow = async () => {
    if (!awaitingVaultDecision) return;
    setVaulting(true);
    try {
      await vaultAtStage();
      navigation.replace('Hub');
    } catch {
      // Error surfaced by runStore.error.
    } finally {
      setVaulting(false);
    }
  };

  const handlePressOn = () => {
    if (!awaitingVaultDecision) return;
    pressOn();
    navigation.replace('Hub');
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>After Stage {completedStage ?? '—'}</Text>
          {runResult !== null && runResult !== 'ongoing' && (
            <View style={[styles.resultBadge, runResult === 'won' ? styles.resultWon : styles.resultLost]}>
              <Text style={styles.resultBadgeText}>{runResult.toUpperCase()}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('RunMap')} style={styles.mapLink}>
          <Text style={styles.mapLinkText}>Map →</Text>
        </TouchableOpacity>
      </View>

      {report !== null && (
        <Text style={styles.battleSummary}>
          Last battle: {report.battleResult} · {report.enemyCount} enemies · {report.tickCount} ticks
        </Text>
      )}

      <View style={styles.rewardsSection}>
        <RewardBlock title="Banked" rewards={bankedRewards} tint="#1a7a2a" />
        <RewardBlock
          title={!isRunEnded && vaultStreak > 0 ? `Vaulted (${vaultStreak} stage${vaultStreak > 1 ? 's' : ''} at risk)` : 'Vaulted'}
          rewards={vaultedRewards}
          tint="#7a5a10"
          runOngoing={!isRunEnded}
        />
      </View>

      {awaitingVaultDecision && (
        <View style={styles.checkpointSuccessCard}>
          <Text style={styles.checkpointSuccessText}>Vault Decision</Text>
          <Text style={styles.checkpointErrorBody}>
            {vaultStreak === 1
              ? 'This stage\'s haul is at risk — die or flee and lose it.'
              : `${vaultStreak} stages of vault at risk — die or flee and forfeit all of it.`}
          </Text>
          {vaultStreak > 1 && (
            <Text style={styles.checkpointCardBody}>
              Vault boosted {rewardMultiplierApplied.toFixed(1)}x this stage.
            </Text>
          )}
          <Text style={styles.checkpointCardBody}>
            {multiplierAtCap
              ? 'At maximum 3.0x — pressing on earns no further multiplier.'
              : `Press On to earn ${rewardMultiplierNext.toFixed(1)}x vault on the next stage.`}
          </Text>
          <View style={styles.actions}>
            <PrimaryButton
              title="Vault Now — Return to Hub"
              onPress={() => void handleVaultNow()}
              disabled={vaulting}
              busy={vaulting}
            />
            <PrimaryButton
              title={multiplierAtCap ? 'Press On (capped 3.0x) — Return to Hub' : 'Press On (Risk) — Return to Hub'}
              variant="secondary"
              onPress={handlePressOn}
              disabled={vaulting}
            />
          </View>
        </View>
      )}

      {/* Progression delta — shown after endRun settles */}
      {progression !== null && (
        <View style={styles.progressionCard}>
          <Text style={styles.progressionTitle}>Run Settled</Text>
          <View style={styles.progressionRow}>
            <Text style={styles.progressionItem}>
              ⚡ +{progression.awardedAscensionCells} cells
            </Text>
            {progression.lineageRankDelta > 0 && (
              <Text style={styles.progressionItem}>
                ↑ Rank +{progression.lineageRankDelta}
              </Text>
            )}
          </View>
          {progression.newlyUnlockedClassIds.length > 0 && (
            <View style={styles.unlockedSection}>
              <Text style={styles.unlockedLabel}>Newly Unlocked</Text>
              {progression.newlyUnlockedClassIds.map((id) => {
                const c = CLASS_BY_ID.get(id as ClassId);
                return (
                  <Text key={id} style={styles.unlockedClass}>
                    🔓 {c?.name ?? id} (T{c?.tier ?? '?'})
                  </Text>
                );
              })}
            </View>
          )}
        </View>
      )}

      {runError !== null ? <Text style={styles.error}>{runError}</Text> : null}

      {!isRunEnded && (
        <View style={styles.actions}>
          <PrimaryButton
            title="Back to Battle"
            variant="secondary"
            onPress={() => navigation.replace('Battle')}
            disabled={awaitingVaultDecision}
          />
        </View>
      )}

      {canEndRun && (
        <View style={styles.actions}>
          <PrimaryButton
            title="End Run & Settle"
            onPress={() => void handleEndRun()}
            disabled={settling || awaitingVaultDecision}
            busy={settling}
          />
        </View>
      )}

      {(isRunEnded || progression !== null) && (
        <View style={styles.actions}>
          <PrimaryButton
            title="Play Again"
            variant="secondary"
            onPress={handlePlayAgain}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: '#eff5f1' },
  container: { padding: 20, gap: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { gap: 6 },
  title: { fontSize: 22, fontWeight: '700', color: '#12372a' },
  resultBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  resultWon: { backgroundColor: '#1a7a2a' },
  resultLost: { backgroundColor: '#8b1a1a' },
  resultBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  mapLink: { paddingTop: 4 },
  mapLinkText: { fontSize: 12, color: '#2a5ab0', fontWeight: '600' },
  battleSummary: { fontSize: 13, color: '#36564a' },
  rewardsSection: { gap: 8 },
  progressionCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#4a9a5a',
    backgroundColor: '#f0faf2',
    padding: 14,
    gap: 8,
  },
  progressionTitle: { fontSize: 14, fontWeight: '700', color: '#1a5a2a' },
  progressionRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  progressionItem: { fontSize: 15, fontWeight: '600', color: '#1a5a2a' },
  unlockedSection: { gap: 4 },
  unlockedLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#4a8a5a' },
  unlockedClass: { fontSize: 14, color: '#1a5a2a', fontWeight: '600' },
  actions: { gap: 8 },
  checkpointSuccessCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a9a5a',
    backgroundColor: '#f0faf2',
    padding: 10,
  },
  checkpointSuccessText: { fontSize: 13, color: '#1a5a2a', fontWeight: '600' },
  checkpointErrorBody: { fontSize: 12, color: '#8b1a1a' },
  checkpointCardBody: { fontSize: 12, color: '#3a5a48' },
  error: { fontSize: 13, color: '#a10f0f' },
});
