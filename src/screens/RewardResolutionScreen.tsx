import { useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/AppNavigator';
import type { ProgressionDelta, RewardBundle } from '@/features/run/types';
import { CLASS_BY_ID } from '@/content';
import type { ClassId } from '@/content/types';
import { lookupGearTemplate } from '@/content/gear';
import { useCombatStore, useRunStore } from '@/stores';

type Props = NativeStackScreenProps<HomeStackParamList, 'RewardResolution'>;

function RewardRow({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <View style={styles.rewardRow}>
      <Text style={styles.rewardLabel}>{label}</Text>
      <Text style={styles.rewardValue}>+{value}</Text>
    </View>
  );
}

function RewardBlock({ title, rewards, tint, runOngoing }: { title: string; rewards: RewardBundle; tint: string; runOngoing?: boolean }) {
  const hasAny =
    rewards.gold > 0 ||
    rewards.ascensionCells > 0 ||
    rewards.xpScrollMinor > 0 ||
    rewards.xpScrollStandard > 0 ||
    rewards.xpScrollGrand > 0 ||
    rewards.gearIds.length > 0;

  return (
    <View style={[styles.rewardBlock, { borderLeftColor: tint }]}>
      <Text style={[styles.rewardBlockTitle, { color: tint }]}>{title}</Text>
      {hasAny ? (
        <>
          <RewardRow label="Gold" value={rewards.gold} />
          <RewardRow label="Ascension Cells" value={rewards.ascensionCells} />
          <RewardRow label="XP Scroll (Minor)" value={rewards.xpScrollMinor} />
          <RewardRow label="XP Scroll (Standard)" value={rewards.xpScrollStandard} />
          <RewardRow label="XP Scroll (Grand)" value={rewards.xpScrollGrand} />
          {rewards.gearIds.map((id, index) => {
            const resolved = lookupGearTemplate(id);
            const name = resolved?.name ?? id;
            const rarity = resolved?.rarity;
            return (
              <Text key={`gear-${index}`} style={styles.gearItem}>
                {name}{rarity !== undefined ? ` · ${rarity}` : ''}
              </Text>
            );
          })}
          {runOngoing === true && rewards.gearIds.length > 0 && (
            <Text style={styles.gearAtRisk}>
              ⚠ Gear is at risk — flee or defeat forfeits all vaulted gear. Bank at a checkpoint to keep it.
            </Text>
          )}
        </>
      ) : (
        <Text style={styles.emptyReward}>—</Text>
      )}
    </View>
  );
}

export function RewardResolutionScreen({ navigation }: Props) {
  const runId = useRunStore((state) => state.runId);
  const stage = useRunStore((state) => state.stage);
  const runResult = useRunStore((state) => state.runResult);
  const runError = useRunStore((state) => state.error);
  const bankedRewards = useRunStore((state) => state.bankedRewards);
  const vaultedRewards = useRunStore((state) => state.vaultedRewards);
  const pendingCheckpointStage = useRunStore((state) => state.pendingCheckpointStage);
  const checkpointBankError = useRunStore((state) => state.checkpointBankError);
  const lastCheckpointBankedStage = useRunStore((state) => state.lastCheckpointBankedStage);
  const retryCheckpointBanking = useRunStore((state) => state.retryCheckpointBanking);
  const endRun = useRunStore((state) => state.endRun);
  const resetRun = useRunStore((state) => state.resetRun);

  const report = useCombatStore((state) => state.report);
  const clearCombat = useCombatStore((state) => state.clear);

  const [progression, setProgression] = useState<ProgressionDelta | null>(null);
  const [settling, setSettling] = useState(false);
  const [retryingCheckpoint, setRetryingCheckpoint] = useState(false);

  const completedStage = report?.stageIndex ?? stage;
  const checkpointPendingForThisStage =
    completedStage !== null && pendingCheckpointStage === completedStage;
  const checkpointBankedForThisStage =
    completedStage !== null && lastCheckpointBankedStage === completedStage;

  const isRunEnded = runResult === 'won' || runResult === 'lost';
  const canEndRun = runId !== null && !settling && !isRunEnded && !checkpointPendingForThisStage;

  useFocusEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  });

  const handleEndRun = async () => {
    if (!canEndRun) return;
    const finalResult = report?.outcomeResult ?? 'fled';
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

  const handleRetryCheckpoint = async () => {
    setRetryingCheckpoint(true);
    try {
      await retryCheckpointBanking();
    } catch {
      // Error surfaced by runStore.checkpointBankError.
    } finally {
      setRetryingCheckpoint(false);
    }
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
        <RewardBlock title="Vaulted" rewards={vaultedRewards} tint="#7a5a10" runOngoing={!isRunEnded} />
      </View>

      {checkpointBankedForThisStage && (
        <View style={styles.checkpointSuccessCard}>
          <Text style={styles.checkpointSuccessText}>
            Checkpoint banked! All vaulted rewards — including gear — are now safe.
          </Text>
        </View>
      )}

      {checkpointPendingForThisStage && (
        <View style={styles.checkpointErrorCard}>
          <Text style={styles.checkpointErrorTitle}>Checkpoint Banking Pending</Text>
          <Text style={styles.checkpointErrorBody}>
            You need to bank this checkpoint before continuing the run.
          </Text>
          {checkpointBankError !== null && (
            <Text style={styles.checkpointErrorBody}>{checkpointBankError}</Text>
          )}
          <View style={styles.actions}>
            <PrimaryButton
              title="Retry Checkpoint Banking"
              onPress={() => { handleRetryCheckpoint().catch(() => undefined); }}
              disabled={retryingCheckpoint}
              busy={retryingCheckpoint}
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
            disabled={checkpointPendingForThisStage}
          />
        </View>
      )}

      {canEndRun && (
        <View style={styles.actions}>
          <PrimaryButton
            title="End Run & Settle"
            onPress={() => { handleEndRun().catch(() => undefined); }}
            disabled={settling}
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
  rewardBlock: {
    borderLeftWidth: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b7d0c2',
    backgroundColor: '#fcfffd',
    padding: 14,
    paddingLeft: 12,
    gap: 4,
  },
  rewardBlockTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rewardLabel: { fontSize: 13, color: '#2f3f39' },
  rewardValue: { fontSize: 13, fontWeight: '600', color: '#1a5a2a' },
  gearItem: { fontSize: 12, color: '#5a7a4a' },
  gearAtRisk: { fontSize: 11, color: '#8b4000', fontWeight: '600', marginTop: 4 },
  emptyReward: { fontSize: 13, color: '#8aaa9a' },
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
  checkpointErrorCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e08080',
    backgroundColor: '#fff2f2',
    padding: 10,
    gap: 6,
  },
  checkpointErrorTitle: { fontSize: 13, color: '#8b1a1a', fontWeight: '700' },
  checkpointErrorBody: { fontSize: 12, color: '#8b1a1a' },
  error: { fontSize: 13, color: '#a10f0f' },
});
