import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';
import { AbilityDetailsModal } from '@/components/organisms/AbilityDetailsModal';
import { CastPulse } from '@/components/molecules/CastPulse';
import { DamagePopupOverlay } from '@/components/molecules/DamagePopupOverlay';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/AppNavigator';
import { CLASS_BY_ID, SKILL_BY_ID } from '@/content';
import type { ClassId, SkillId } from '@/content/types';
import { canCast, type InstanceId, SYNTHETIC_BASIC_ATTACK_ID } from '@/domain/combat';
import { decideEnemyAction } from '@/domain/combat/bossAI';
import {
  selectAliveEnemies,
  selectPlayerUnit,
  selectReadyUnitId,
  useCombatStore,
} from '@/stores/combatStore';
import { usePlayerStore, useRunStore } from '@/stores';
import { useGearInventory } from '@/hooks/useGearInventory';
import { HpBar } from './HpBar';
import { MpBar } from './MpBar';
import { CtIndicator } from './CtIndicator';
import { StatusChips } from './StatusChips';
import { EnemyRow } from './EnemyRow';
import { AbilityButton, describeSkillCost, reasonLabel } from './AbilityButton';
import { EventLog } from './EventLog';

type Props = NativeStackScreenProps<HomeStackParamList, 'Battle'>;

type StageType = 'normal' | 'mini_boss' | 'gate' | 'counter';

const STAGE_TYPES: Record<number, StageType> = { 5: 'mini_boss', 10: 'gate', 20: 'gate', 30: 'counter' };
const STAGE_TYPE_LABELS: Record<StageType, string> = {
  normal: 'Normal Stage',
  mini_boss: 'Mini-Boss',
  gate: 'Checkpoint Gate',
  counter: 'Counter Boss',
};
const STAGE_TYPE_COLORS: Record<StageType, string> = {
  normal: '#4a3a28',
  mini_boss: '#7a3000',
  gate: '#1a5a2a',
  counter: '#7a0000',
};
const STAGE_TYPE_BG: Record<StageType, string> = {
  normal: '#fffdf8',
  mini_boss: '#fff3e6',
  gate: '#edfaee',
  counter: '#fde8e8',
};

export function BattleScreen({ navigation }: Props) {
  const runId = useRunStore((state) => state.runId);
  const seed = useRunStore((state) => state.seed);
  const stage = useRunStore((state) => state.stage);
  const activeClassId = useRunStore((state) => state.activeClassId);
  const runStatus = useRunStore((state) => state.status);
  const runError = useRunStore((state) => state.error);
  const submitStageOutcome = useRunStore((state) => state.submitStageOutcome);
  const endRunAction = useRunStore((state) => state.endRun);
  const classRanks = usePlayerStore((state) => state.classRanks);
  const { equippedBySlot } = useGearInventory();

  const combatStatus = useCombatStore((state) => state.status);
  const combatError = useCombatStore((state) => state.error);
  const report = useCombatStore((state) => state.report);
  const engineState = useCombatStore((state) => state.engine?.state ?? null);
  const preparedStageIndex = useCombatStore((state) => state.prepared?.stageIndex ?? null);
  const autoPlay = useCombatStore((state) => state.autoPlay);
  const setAutoPlay = useCombatStore((state) => state.setAutoPlay);
  const beginInteractive = useCombatStore((state) => state.beginInteractive);
  const tickAdvance = useCombatStore((state) => state.tickAdvance);
  const stepCombat = useCombatStore((state) => state.step);
  const clearCombat = useCombatStore((state) => state.clear);

  const player = useCombatStore(selectPlayerUnit);
  // useShallow: selectAliveEnemies returns a fresh array each call (Object.values + filter).
  // Without shallow-equality, Zustand re-renders this component every commit → infinite loop.
  const enemies = useCombatStore(useShallow(selectAliveEnemies));
  const readyUnitId = useCombatStore(selectReadyUnitId);

  const [targetId, setTargetId] = useState<InstanceId | null>(null);
  const [lastReason, setLastReason] = useState<string | null>(null);
  const [detailsSkillId, setDetailsSkillId] = useState<SkillId | null>(null);

  const stageType: StageType = stage !== null ? (STAGE_TYPES[stage] ?? 'normal') : 'normal';
  const classData = activeClassId ? CLASS_BY_ID.get(activeClassId as ClassId) : null;
  const classRank =
    activeClassId !== null ? Math.max(0, Math.trunc(classRanks[activeClassId] ?? 0)) : 0;
  const equippedGearTemplateIds = useMemo(
    () =>
      [
        equippedBySlot.weapon?.templateId,
        equippedBySlot.armor?.templateId,
        equippedBySlot.accessory?.templateId,
      ].filter((id): id is string => typeof id === 'string' && id.length > 0),
    [equippedBySlot.accessory?.templateId, equippedBySlot.armor?.templateId, equippedBySlot.weapon?.templateId],
  );
  const battleEnded = engineState !== null && engineState.result !== 'ongoing';
  const playerReady = player !== null && readyUnitId === player.id;

  useFocusEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  });

  // Bounce out if there's no active run.
  useEffect(() => {
    if (runId === null) navigation.replace('Hub');
  }, [navigation, runId]);

  // Auto-prepare a fresh battle when the screen mounts or when the stage advances.
  useEffect(() => {
    if (
      seed === null ||
      stage === null ||
      activeClassId === null ||
      runId === null
    ) {
      return;
    }
    const needsFreshSetup =
      combatStatus === 'idle' || (combatStatus === 'finished' && preparedStageIndex !== stage);
    if (needsFreshSetup) {
      beginInteractive({
        seed,
        stageIndex: stage,
        activeClassId: activeClassId as ClassId,
        classRank,
        equippedGearTemplateIds,
      });
    }
  }, [
    activeClassId,
    beginInteractive,
    classRank,
    combatStatus,
    equippedGearTemplateIds,
    preparedStageIndex,
    runId,
    seed,
    stage,
  ]);

  // Auto-default targeting to the first alive enemy.
  useEffect(() => {
    if (enemies.length === 0) {
      if (targetId !== null) setTargetId(null);
      return;
    }
    const stillAlive = targetId !== null && enemies.some((e) => e.id === targetId);
    if (!stillAlive) setTargetId(enemies[0]?.id ?? null);
  }, [enemies, targetId]);

  // Enemy AI + auto-play AI: drive units on a visible timer instead of a synchronous loop.
  // - Nobody ready → tickAdvance every 50 ms (just simulated time passing).
  // - Enemy ready → auto-attack the player after 250 ms (gives the user time to read).
  // - Player ready AND auto-play toggle on → auto-attack the current target after 350 ms.
  useEffect(() => {
    if (engineState === null || battleEnded) return;
    if (readyUnitId === null) {
      const t = setTimeout(() => tickAdvance(), 50);
      return () => clearTimeout(t);
    }
    if (player !== null && readyUnitId !== player.id) {
      const t = setTimeout(() => {
        const action = decideEnemyAction({
          state: engineState,
          unitId: readyUnitId,
          skillLookup: (id) => SKILL_BY_ID.get(id),
        });
        stepCombat(action);
      }, 250);
      return () => clearTimeout(t);
    }
    if (autoPlay && player !== null && readyUnitId === player.id && targetId !== null) {
      const t = setTimeout(() => {
        stepCombat({ kind: 'basic_attack', unitId: player.id, targetId });
      }, 350);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [autoPlay, battleEnded, engineState, player, readyUnitId, stepCombat, targetId, tickAdvance]);

  // Auto-submit when autoPlay is on and battle has ended — fires after a 1.5s delay so the
  // player sees the result card briefly before advancing.
  useEffect(() => {
    if (!autoPlay || !battleEnded || report === null || runStatus === 'submitting_outcome') return;
    const t = setTimeout(() => {
      void (async () => {
        try {
          await submitStageOutcome({
            stageIndex: report.stageIndex,
            result: report.outcomeResult,
            rewards: report.claimedRewards,
            hpRemaining: report.hpRemaining,
            elapsedSeconds: report.elapsedSeconds,
          });
          navigation.replace('RewardResolution');
        } catch {
          // Surfaced by run store.
        }
      })();
    }, 1500);
    return () => clearTimeout(t);
  }, [autoPlay, battleEnded, navigation, report, runStatus, submitStageOutcome]);

  // Submit outcome to backend after report finalizes.
  const handleSubmit = async () => {
    if (report === null) return;
    try {
      await submitStageOutcome({
        stageIndex: report.stageIndex,
        result: report.outcomeResult,
        rewards: report.claimedRewards,
        hpRemaining: report.hpRemaining,
        elapsedSeconds: report.elapsedSeconds,
      });
      navigation.replace('RewardResolution');
    } catch {
      // Surfaced by run store.
    }
  };

  const handleForfeit = (): void => {
    Alert.alert(
      'Forfeit Run?',
      'This ends the run as fled. Banked rewards persist; vault is forfeited and you forfeit the same-lineage tier-up unlock.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forfeit',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await endRunAction('fled');
                clearCombat();
                navigation.replace('Hub');
              } catch {
                // Surfaced by run store.
              }
            })();
          },
        },
      ],
    );
  };

  const handleAbility = (skillId: SkillId) => {
    if (player === null || engineState === null) return;
    setLastReason(null);
    const action =
      skillId === SYNTHETIC_BASIC_ATTACK_ID
        ? targetId !== null
          ? { kind: 'basic_attack' as const, unitId: player.id, targetId }
          : null
        : { kind: 'cast_skill' as const, unitId: player.id, skillId, targetIds: targetId !== null ? [targetId] : [] };
    if (action === null) {
      setLastReason('invalid_target');
      return;
    }
    const reason = stepCombat(action);
    if (reason !== null) setLastReason(reason);
  };

  const skillSlots = useMemo<readonly SkillId[]>(() => {
    if (player === null) return [];
    const basics: SkillId[] = [];
    if (player.basicAttackSkillId !== undefined) basics.push(player.basicAttackSkillId);
    return [...basics, ...player.skillIds];
  }, [player]);

  const selectedTarget = useMemo(() => {
    if (targetId === null) return null;
    return enemies.find((enemy) => enemy.id === targetId) ?? null;
  }, [enemies, targetId]);

  return (
    <>
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      {stage !== null && (
        <View style={[styles.stageBanner, { backgroundColor: STAGE_TYPE_BG[stageType], borderColor: STAGE_TYPE_COLORS[stageType] }]}>
          <View style={styles.stageBannerRow}>
            <Text style={[styles.stageNum, { color: STAGE_TYPE_COLORS[stageType] }]}>Stage {stage}</Text>
            <View style={[styles.stageTypeBadge, { backgroundColor: STAGE_TYPE_COLORS[stageType] }]}>
              <Text style={styles.stageTypeBadgeText}>{STAGE_TYPE_LABELS[stageType]}</Text>
            </View>
          </View>
          <View style={styles.stageBannerActionsRow}>
            <PrimaryButton
              title={autoPlay ? 'Auto: ON — Tap to Stop' : 'Auto: OFF'}
              variant={autoPlay ? 'destructive' : 'secondary'}
              onPress={() => setAutoPlay(!autoPlay)}
              fullWidth={false}
              style={styles.autoPlayBtn}
            />
            <TouchableOpacity onPress={() => navigation.navigate('RunMap')} style={styles.mapLink}>
              <Text style={styles.mapLinkText}>View Map →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* AUTO PLAYING strip — extra-large tap target while auto is on, also disables */}
      {autoPlay && !battleEnded && (
        <TouchableOpacity onPress={() => setAutoPlay(false)} style={styles.autoActiveStrip}>
          <Text style={styles.autoActiveStripText}>⚡ AUTO-PLAY ACTIVE — tap to stop</Text>
        </TouchableOpacity>
      )}

      {/* Event log */}
      {engineState !== null && <EventLog events={engineState.log} />}

      {/* Player unit panel */}
      {player !== null && (
        <CastPulse
          unitId={player.id}
          style={[styles.playerCard, playerReady && styles.playerCardReady]}
        >
          <DamagePopupOverlay unitId={player.id} />
          <View style={styles.playerHeader}>
            <Text style={styles.playerName}>{classData?.name ?? player.displayName}</Text>
            <CtIndicator unit={player} isReady={playerReady} />
          </View>
          <HpBar unit={player} color="#3a8a5a" />
          <MpBar unit={player} />
          <StatusChips unit={player} />
        </CastPulse>
      )}

      {/* Enemies */}
      {enemies.length > 0 && (
        <View style={styles.enemiesSection}>
          <Text style={styles.sectionLabel}>Enemies ({enemies.length})</Text>
          {enemies.map((enemy) => (
            <EnemyRow
              key={enemy.id}
              enemy={enemy}
              isReady={readyUnitId === enemy.id}
              isTarget={targetId === enemy.id}
              onSelect={() => setTargetId(enemy.id)}
            />
          ))}
        </View>
      )}

      {/* Ability buttons (shown when player is ready) */}
      {player !== null && engineState !== null && !battleEnded && playerReady && (
        <View style={styles.abilitiesSection}>
          <Text style={styles.sectionLabel}>Abilities</Text>
          <View style={styles.abilitiesGrid}>
            {skillSlots.map((skillId) => {
              const skill = SKILL_BY_ID.get(skillId);
              const label = skill?.name ?? (skillId === player.basicAttackSkillId ? 'Basic Attack' : skillId);
              const cost = describeSkillCost(skillId);
              const cooldown = player.cooldowns[skillId] ?? 0;

              const targetIds = targetId !== null ? [targetId] : [];
              let disabled = false;
              let reason: string | undefined;
              if (skill !== undefined) {
                const validation = canCast(engineState, player, skill, targetIds);
                if (!validation.ok) {
                  disabled = true;
                  reason = reasonLabel(validation.reason);
                }
              } else {
                // Basic attack — needs a target.
                if (targetIds.length === 0) {
                  disabled = true;
                  reason = reasonLabel('invalid_target');
                }
              }

              return (
                <AbilityButton
                  key={skillId}
                  label={label}
                  cost={cost}
                  cooldown={cooldown}
                  disabled={disabled}
                  {...(reason !== undefined ? { reason } : {})}
                  onPress={() => handleAbility(skillId)}
                  onLongPress={() => setDetailsSkillId(skillId)}
                />
              );
            })}
          </View>
          {lastReason !== null && (
            <Text style={styles.lastReason}>Last action: {reasonLabel(lastReason)}</Text>
          )}
        </View>
      )}

      {/* Waiting indicator while non-player units are acting. */}
      {!battleEnded && !playerReady && enemies.length > 0 && (
        <View style={styles.waitingCard}>
          <Text style={styles.waitingText}>
            {readyUnitId === null ? 'Time advancing…' : 'Enemy acting…'}
          </Text>
        </View>
      )}

      {/* Errors */}
      {(runError !== null || combatError !== null) && (
        <View style={styles.errorCard}>
          {runError !== null && <Text style={styles.error}>{runError}</Text>}
          {combatError !== null && <Text style={styles.error}>{combatError}</Text>}
        </View>
      )}

      {/* Result banner once battle ends */}
      {battleEnded && report !== null && (
        <View style={[styles.resultCard, report.battleResult === 'won' ? styles.cardWon : styles.cardLost]}>
          <View style={styles.resultRow}>
            <Text style={[styles.resultBadge, report.battleResult === 'won' ? styles.resultWon : styles.resultLost]}>
              {report.battleResult.toUpperCase()}
            </Text>
            <Text style={styles.resultMeta}>
              {report.tickCount} ticks · {report.elapsedSeconds}s
            </Text>
          </View>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardItem}>🪙 {report.claimedRewards.gold}g</Text>
            <Text style={styles.rewardItem}>⚡ {report.claimedRewards.ascensionCells} cells</Text>
            {report.claimedRewards.xpScrollMinor > 0 && (
              <Text style={styles.rewardItem}>📜 ×{report.claimedRewards.xpScrollMinor}</Text>
            )}
          </View>
          <View style={styles.actions}>
            <PrimaryButton
              title="Submit & Continue"
              variant="secondary"
              onPress={() => { handleSubmit().catch(() => undefined); }}
              disabled={runStatus === 'submitting_outcome'}
              busy={runStatus === 'submitting_outcome'}
            />
          </View>
        </View>
      )}

      

      {/* Forfeit Run — visible while a run is active and not already settled */}
      {!battleEnded && runId !== null && runStatus !== 'ending_run' && (
        <View style={styles.forfeitContainer}>
          <TouchableOpacity onPress={handleForfeit} style={styles.forfeitBtn}>
            <Text style={styles.forfeitBtnText}>Forfeit Run</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Debug actions */}
      {__DEV__ && (
        <View style={styles.actions}>
          <PrimaryButton
            title="Clear Battle"
            variant="destructive"
            onPress={clearCombat}
            disabled={combatStatus === 'simulating'}
          />
        </View>
      )}
    </ScrollView>

    <AbilityDetailsModal
      skillId={detailsSkillId}
      caster={player}
      target={selectedTarget}
      onClose={() => setDetailsSkillId(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: '#f6f6fa' },
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  stageBanner: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    gap: 6,
  },
  stageBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  stageNum: { fontSize: 18, fontWeight: '800' },
  stageTypeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  stageTypeBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  stageBannerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  autoPlayBtn: { flex: 1 },
  autoActiveStrip: {
    backgroundColor: '#a04040',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  autoActiveStripText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  // Legacy Switch styles kept for layout reference; no longer rendered.
  autoPlayToggle: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
  autoPlayLabel: { fontSize: 11, color: '#4a3a28' },
  mapLink: { alignSelf: 'flex-end' },
  mapLinkText: { fontSize: 12, color: '#2a5ab0', fontWeight: '600' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#6a7090', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },

  playerCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#cfd3e9',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 8,
  },
  playerCardReady: {
    borderColor: '#3a8a5a',
    backgroundColor: '#f4fff7',
  },
  playerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  playerName: { fontSize: 16, fontWeight: '700', color: '#1e2238' },

  enemiesSection: { gap: 8 },
  abilitiesSection: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cfd3e9',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 6,
  },
  abilitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  lastReason: { fontSize: 11, color: '#8b1a1a', marginTop: 4 },

  waitingCard: {
    borderRadius: 8,
    backgroundColor: '#f0eef8',
    padding: 10,
    alignItems: 'center',
  },
  waitingText: { fontSize: 12, color: '#5a5a78', fontStyle: 'italic' },

  resultCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
  },
  cardWon: { borderColor: '#4a9a5a', backgroundColor: '#f0faf2' },
  cardLost: { borderColor: '#c04040', backgroundColor: '#faf0f0' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultBadge: { fontSize: 18, fontWeight: '800' },
  resultWon: { color: '#1a7a2a' },
  resultLost: { color: '#8b1a1a' },
  resultMeta: { fontSize: 12, color: '#6a7090' },
  rewardRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  rewardItem: { fontSize: 13, color: '#2a315b' },

  actions: { gap: 8, marginTop: 4 },
  errorCard: {
    borderRadius: 8,
    backgroundColor: '#fde8e8',
    borderWidth: 1,
    borderColor: '#e08080',
    padding: 12,
    gap: 4,
  },
  error: { fontSize: 13, color: '#8b1a1a' },

  forfeitContainer: { alignItems: 'center', marginTop: 4 },
  forfeitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a04040',
  },
  forfeitBtnText: { fontSize: 12, color: '#a04040', fontWeight: '600' },
});
