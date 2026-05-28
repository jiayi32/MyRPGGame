import { useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';
import { RewardBlock } from './RewardBlock';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/AppNavigator';
import type { EndRunSettlementLedger, ProgressionDelta, RewardBundle } from '@/features/run/types';
import { CLASS_BY_ID } from '@/content';
import type { ClassId } from '@/content/types';
import { useCombatStore, useRunStore } from '@/stores';

type Props = NativeStackScreenProps<HomeStackParamList, 'RewardResolution'>;

const ECONOMY_EXPLAINER_SEEN_KEY = 'ui.rewardResolution.economyExplainer.seen.v1';

type NarrativeOutcome = 'won' | 'lost' | 'fled' | 'ongoing' | null | undefined;

interface MilestoneNarrative {
  title: string;
  body: string;
  tone: 'neutral' | 'warning' | 'victory';
}

function formatRewardBundleSummary(bundle: RewardBundle): string {
  return `Gold ${bundle.gold} · Cells ${bundle.ascensionCells} · Sigils ${bundle.sigilShards} · Scrolls ${bundle.xpScrollMinor}/${bundle.xpScrollStandard}/${bundle.xpScrollGrand} · Gear ${bundle.gearIds.length}`;
}

function resolveMilestoneNarrative(
  stage: number | null | undefined,
  outcome: NarrativeOutcome,
): MilestoneNarrative | null {
  if (outcome === 'lost') {
    return {
      title: 'The Dungeon Pushes Back',
      body: 'Defeat still teaches the lineage. Recover, adjust your build, and descend again.',
      tone: 'warning',
    };
  }
  if (outcome === 'fled') {
    return {
      title: 'A Tactical Retreat',
      body: 'You escaped with what was safe. Next run can press deeper with better timing.',
      tone: 'neutral',
    };
  }
  if (stage === null || stage === undefined) return null;

  if (stage === 1) {
    return {
      title: 'First Ember',
      body: 'Your first clear marks the beginning of a lineage run. Every stage ahead raises the stakes.',
      tone: 'neutral',
    };
  }
  if (stage === 5) {
    return {
      title: 'Pyre Warden Felled',
      body: 'The forge gate trembles. Boss victories now define your long-term economy and unlock pace.',
      tone: 'victory',
    };
  }
  if (stage === 10) {
    return {
      title: 'Gate Boss Broken',
      body: 'A major checkpoint has fallen. Your run now shifts from survival into high-risk scaling.',
      tone: 'victory',
    };
  }
  if (stage === 20) {
    return {
      title: 'Deep Vault Threshold',
      body: 'At this depth, banking discipline matters as much as combat power.',
      tone: 'neutral',
    };
  }
  if (stage === 30) {
    return {
      title: 'Counter Boss Defeated',
      body: 'You closed a full dungeon arc. This run sets your benchmark for future lineage mastery.',
      tone: 'victory',
    };
  }
  return null;
}

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
  const [settlementLedger, setSettlementLedger] = useState<EndRunSettlementLedger | null>(null);
  const [settling, setSettling] = useState(false);
  const [vaulting, setVaulting] = useState(false);
  const [explainerHydrated, setExplainerHydrated] = useState(false);
  const [showEconomyExplainer, setShowEconomyExplainer] = useState(false);
  const [persistingExplainerChoice, setPersistingExplainerChoice] = useState(false);

  const completedStage = report?.stageIndex ?? stage;
  const rewardMultiplierApplied = Math.min(1 + Math.max(0, vaultStreak - 1) * 0.2, 3);
  const rewardMultiplierNext = Math.min(1 + vaultStreak * 0.2, 3);
  const multiplierAtCap = rewardMultiplierNext >= 3;

  const isRunEnded = runResult === 'won' || runResult === 'lost';
  const canEndRun = runId !== null && !settling && !isRunEnded;
  const canContinueToBattle = runId !== null && !isRunEnded && !awaitingVaultDecision && progression === null;
  const finalResult = report?.outcomeResult ?? 'fled';
  const milestoneNarrative = resolveMilestoneNarrative(
    completedStage,
    report?.outcomeResult ?? runResult,
  );

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(ECONOMY_EXPLAINER_SEEN_KEY)
      .then((value) => {
        if (!active) return;
        setShowEconomyExplainer(value !== '1');
        setExplainerHydrated(true);
      })
      .catch(() => {
        if (!active) return;
        setShowEconomyExplainer(true);
        setExplainerHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Auto-settle when autoPlay is on and battle ends without a pending vault decision.
  useEffect(() => {
    if (!autoPlay || !canEndRun || awaitingVaultDecision) return;
    setSettling(true);
    endRun(finalResult)
      .then((response) => {
        setProgression(response.progression);
        setSettlementLedger(response.settlementLedger);
      })
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
      setSettlementLedger(response.settlementLedger);
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
    setSettlementLedger(null);
    navigation.replace('Hub');
  };

  const handleContinueToBattle = () => {
    navigation.replace('Battle');
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
    navigation.replace('Battle');
  };

  const handleDismissEconomyExplainerForNow = () => {
    setShowEconomyExplainer(false);
  };

  const handleMarkEconomyExplainerSeen = async () => {
    setPersistingExplainerChoice(true);
    try {
      await AsyncStorage.setItem(ECONOMY_EXPLAINER_SEEN_KEY, '1');
      setShowEconomyExplainer(false);
    } catch {
      // Keep this non-blocking; tutorial visibility is optional UX state.
      setShowEconomyExplainer(false);
    } finally {
      setPersistingExplainerChoice(false);
    }
  };

  const handleShowEconomyExplainer = () => {
    setShowEconomyExplainer(true);
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

      {milestoneNarrative !== null && (
        <View
          style={[
            styles.narrativeCard,
            milestoneNarrative.tone === 'warning'
              ? styles.narrativeWarning
              : milestoneNarrative.tone === 'victory'
                ? styles.narrativeVictory
                : styles.narrativeNeutral,
          ]}
        >
          <Text style={styles.narrativeTitle}>{milestoneNarrative.title}</Text>
          <Text style={styles.narrativeBody}>{milestoneNarrative.body}</Text>
        </View>
      )}

      {explainerHydrated && showEconomyExplainer && (
        <View style={styles.economyGuideCard}>
          <Text style={styles.economyGuideTitle}>Economy Quick Guide</Text>
          <Text style={styles.economyGuideBody}>- Banked rewards are always safe.</Text>
          <Text style={styles.economyGuideBody}>- Vaulted rewards are at risk only while the run remains active.</Text>
          <Text style={styles.economyGuideBody}>- Voluntary End Run secures both banked and vaulted rewards.</Text>
          <Text style={styles.economyGuideBody}>- Defeat still forfeits current vaulted rewards.</Text>
          <Text style={styles.economyGuideBody}>- Press On increases your next vault multiplier but raises defeat risk.</Text>
          <View style={styles.economyGuideExample}>
            <Text style={styles.economyGuideExampleTitle}>Simple example</Text>
            <Text style={styles.economyGuideBody}>
              Win two stages, then End Run: both banked and vaulted are secured, but progression is the fled track.
            </Text>
          </View>
          <View style={styles.actions}>
            <PrimaryButton
              title="Got it - don't show again"
              variant="secondary"
              onPress={() => void handleMarkEconomyExplainerSeen()}
              busy={persistingExplainerChoice}
              disabled={persistingExplainerChoice}
            />
            <PrimaryButton
              title="Hide for now"
              variant="primary"
              onPress={handleDismissEconomyExplainerForNow}
              disabled={persistingExplainerChoice}
            />
          </View>
        </View>
      )}

      {explainerHydrated && !showEconomyExplainer && (
        <TouchableOpacity onPress={handleShowEconomyExplainer} style={styles.economyGuideLink}>
          <Text style={styles.economyGuideLinkText}>Show economy tips</Text>
        </TouchableOpacity>
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
              ? 'This stage\'s haul is at risk only if you are defeated.'
              : `${vaultStreak} stages of vault are at risk if you are defeated.`}
          </Text>
          <Text style={styles.checkpointCardBody}>
            You can End Run at any time to secure banked + vaulted rewards, but fled progression is reduced.
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
              title={multiplierAtCap ? 'Press On (capped 3.0x) - Continue to Battle' : 'Press On (Risk) - Continue to Battle'}
              variant="secondary"
              onPress={handlePressOn}
              disabled={vaulting}
            />
            <PrimaryButton
              title="Vault Now - Return to Hub"
              onPress={() => void handleVaultNow()}
              disabled={vaulting}
              busy={vaulting}
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

      {settlementLedger !== null && (
        <View style={styles.ledgerCard}>
          <Text style={styles.ledgerTitle}>Settlement Ledger</Text>
          <Text style={styles.ledgerRow}>Result: {settlementLedger.finalResult.toUpperCase()}</Text>
          <Text style={styles.ledgerRow}>Pre-settle banked: {formatRewardBundleSummary(settlementLedger.preSettleBanked)}</Text>
          <Text style={styles.ledgerRow}>Pre-settle vaulted: {formatRewardBundleSummary(settlementLedger.preSettleVaulted)}</Text>
          <Text style={styles.ledgerRow}>
            Vault outcome: {settlementLedger.vaultDisposition === 'merged' ? 'Merged into bank' : 'Forfeited on defeat'}
          </Text>
          <Text style={styles.ledgerRow}>
            Vault moved to bank: {formatRewardBundleSummary(settlementLedger.vaultedTransferredToBank)}
          </Text>
          <Text style={styles.ledgerRow}>Vault lost: {formatRewardBundleSummary(settlementLedger.vaultForfeited)}</Text>
          <Text style={styles.ledgerRow}>Post-settle banked: {formatRewardBundleSummary(settlementLedger.postSettleBanked)}</Text>
          <Text style={styles.ledgerRow}>
            Progression: +{settlementLedger.progressionAwarded.ascensionCells} cells, rank delta {settlementLedger.progressionAwarded.lineageRankDelta}, unlocks {settlementLedger.progressionAwarded.newlyUnlockedClassIds.length}
          </Text>
        </View>
      )}

      {runError !== null ? <Text style={styles.error}>{runError}</Text> : null}

      {canContinueToBattle && (
        <View style={styles.actions}>
          <PrimaryButton
            title="Continue to Next Stage"
            onPress={handleContinueToBattle}
          />
          <PrimaryButton
            title="Return to Hub"
            variant="secondary"
            onPress={() => navigation.replace('Hub')}
          />
        </View>
      )}

      {canEndRun && (
        <View style={styles.actions}>
          <PrimaryButton
            title="End Run & Secure Vault"
            variant="destructive"
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
  narrativeCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  narrativeNeutral: {
    borderColor: '#cdbda4',
    backgroundColor: '#fffaf0',
  },
  narrativeWarning: {
    borderColor: '#d79a9a',
    backgroundColor: '#fff2f2',
  },
  narrativeVictory: {
    borderColor: '#91c294',
    backgroundColor: '#eef8ef',
  },
  narrativeTitle: { fontSize: 14, fontWeight: '700', color: '#2d2d2d' },
  narrativeBody: { fontSize: 12, color: '#4e4e4e', lineHeight: 18 },
  economyGuideCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c7bfae',
    backgroundColor: '#fffaf0',
    padding: 10,
    gap: 4,
  },
  economyGuideTitle: { fontSize: 14, fontWeight: '700', color: '#3b2b16' },
  economyGuideBody: { fontSize: 12, color: '#4f4438', lineHeight: 18 },
  economyGuideExample: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
    padding: 8,
    gap: 2,
  },
  economyGuideExampleTitle: { fontSize: 12, fontWeight: '700', color: '#4d3a22' },
  economyGuideLink: { alignSelf: 'flex-start', paddingVertical: 2 },
  economyGuideLinkText: { fontSize: 12, color: '#2a5ab0', fontWeight: '600' },
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
  ledgerCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#99b7dc',
    backgroundColor: '#f4f9ff',
    padding: 12,
    gap: 6,
  },
  ledgerTitle: { fontSize: 14, fontWeight: '700', color: '#1d4672' },
  ledgerRow: { fontSize: 12, color: '#224968', lineHeight: 18 },
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
