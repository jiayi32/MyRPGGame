import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { CLASS_BY_ID, SKILL_BY_ID } from '@/content';
import type { ClassId, SkillId } from '@/content/types';
import { canCast, type InstanceId, type Unit, SYNTHETIC_BASIC_ATTACK_ID } from '@/domain/combat';
import {
  selectAliveEnemies,
  selectPlayerUnit,
  selectReadyUnitId,
  useCombatStore,
} from '@/stores/combatStore';
import { useRunStore } from '@/stores';
import { AnimatedHpBar } from '@/components/AnimatedHpBar';
import { DamagePopupOverlay } from '@/components/DamagePopup';
import { CastPulse } from '@/components/CastPulse';

type Props = NativeStackScreenProps<RootStackParamList, 'Battle'>;

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

const EVENT_LOG_TAIL = 8;

function HpBar({ unit, color = '#4a9a5a' }: { unit: Unit; color?: string }) {
  return <AnimatedHpBar hp={unit.hp} hpMax={unit.hpMax} color={color} />;
}

function MpBar({ unit }: { unit: Unit }) {
  const pct = unit.mpMax > 0 ? Math.max(0, Math.min(1, unit.mp / unit.mpMax)) : 0;
  return (
    <View style={styles.barContainer}>
      <View style={[styles.barTrack, { backgroundColor: '#dde4f0' }]}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: '#4a6ae0' }]} />
      </View>
      <Text style={styles.barLabel}>MP {Math.round(unit.mp)} / {Math.round(unit.mpMax)}</Text>
    </View>
  );
}

function CtIndicator({ unit, isReady }: { unit: Unit; isReady: boolean }) {
  if (isReady) {
    return <Text style={[styles.ctChip, styles.ctChipReady]}>READY</Text>;
  }
  return (
    <Text style={styles.ctChip}>
      CT {unit.ct.toFixed(1)}s
    </Text>
  );
}

function StatusChips({ unit }: { unit: Unit }) {
  if (unit.statuses.length === 0) return null;
  return (
    <View style={styles.statusChipsRow}>
      {unit.statuses.map((s) => (
        <View key={`${s.kind}_${s.skillId}_${s.id}`} style={[styles.statusChip, statusChipColor(s.kind)]}>
          <Text style={styles.statusChipText}>
            {abbrevStatus(s.kind)}
            {s.stacks > 1 ? ` ×${s.stacks}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

function statusChipColor(kind: string) {
  switch (kind) {
    case 'dot': return { backgroundColor: '#fde0e0', borderColor: '#a04040' };
    case 'hot': return { backgroundColor: '#e0fde0', borderColor: '#40a040' };
    case 'buff': return { backgroundColor: '#e0e8ff', borderColor: '#4060c0' };
    case 'debuff': return { backgroundColor: '#fde0fd', borderColor: '#a040a0' };
    case 'shield': return { backgroundColor: '#fff8e0', borderColor: '#a08040' };
    case 'stun': return { backgroundColor: '#e8e8e8', borderColor: '#808080' };
    case 'counter': return { backgroundColor: '#fde8c8', borderColor: '#c08040' };
    default: return { backgroundColor: '#f0f0f0', borderColor: '#808080' };
  }
}

function abbrevStatus(kind: string): string {
  switch (kind) {
    case 'dot': return 'DoT';
    case 'hot': return 'HoT';
    case 'buff': return 'Buff';
    case 'debuff': return 'Debuff';
    case 'shield': return 'Shield';
    case 'stun': return 'Stun';
    case 'counter': return 'Counter';
    default: return kind;
  }
}

function EnemyRow({
  enemy,
  isReady,
  isTarget,
  onSelect,
}: {
  enemy: Unit;
  isReady: boolean;
  isTarget: boolean;
  onSelect: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      style={[
        styles.enemyRow,
        isReady && styles.enemyRowReady,
        isTarget && styles.enemyRowTarget,
      ]}
    >
      <DamagePopupOverlay unitId={enemy.id} />
      <View style={styles.enemyHeader}>
        <Text style={styles.enemyName}>{enemy.displayName}</Text>
        <CtIndicator unit={enemy} isReady={isReady} />
      </View>
      <HpBar unit={enemy} color={isTarget ? '#e04040' : '#7a3030'} />
      <StatusChips unit={enemy} />
    </TouchableOpacity>
  );
}

function describeSkillCost(skillId: SkillId): string {
  if (skillId === SYNTHETIC_BASIC_ATTACK_ID) return '';
  const skill = SKILL_BY_ID.get(skillId);
  if (!skill) return '';
  const r = skill.resource;
  if (r.type === 'MP' && typeof r.cost === 'number') return `${r.cost} MP`;
  if (r.type === 'HP' && typeof r.cost === 'number') return `${(r.cost * 100).toFixed(0)}% HP`;
  return '';
}

function AbilityButton({
  label,
  cost,
  onPress,
  disabled,
  cooldown,
  reason,
}: {
  label: string;
  cost: string;
  onPress: () => void;
  disabled: boolean;
  cooldown?: number;
  reason?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.abilityBtn, disabled && styles.abilityBtnDisabled]}
    >
      <Text style={[styles.abilityBtnLabel, disabled && styles.abilityBtnLabelDisabled]}>{label}</Text>
      {cost.length > 0 && (
        <Text style={[styles.abilityBtnCost, disabled && styles.abilityBtnCostDisabled]}>{cost}</Text>
      )}
      {cooldown !== undefined && cooldown > 0 && (
        <Text style={styles.abilityBtnCooldown}>CD {cooldown.toFixed(1)}s</Text>
      )}
      {reason !== undefined && reason.length > 0 && disabled && (
        <Text style={styles.abilityBtnReason}>{reason}</Text>
      )}
    </TouchableOpacity>
  );
}

function reasonLabel(reason: string | undefined): string {
  if (!reason) return '';
  const map: Record<string, string> = {
    not_ready: 'not ready',
    skill_on_cooldown: 'on cooldown',
    insufficient_resource: 'no MP/HP',
    skill_not_owned: 'not owned',
    invalid_target: 'no target',
    unit_dead: 'dead',
    unit_stunned: 'stunned',
    battle_ended: 'ended',
  };
  return map[reason] ?? reason;
}

function EventLog({ events }: { events: readonly { tick: number; type: string; [k: string]: unknown }[] }) {
  if (events.length === 0) return null;
  const tail = events.slice(-EVENT_LOG_TAIL);
  return (
    <View style={styles.eventLog}>
      <Text style={styles.eventLogTitle}>Recent Events</Text>
      {tail.map((e, i) => (
        <Text key={`${e.tick}_${i}`} style={styles.eventLogLine}>
          t={e.tick} {summarizeEvent(e)}
        </Text>
      ))}
    </View>
  );
}

function summarizeEvent(e: { type: string; [k: string]: unknown }): string {
  switch (e.type) {
    case 'damage': return `damage ${(e['amount'] as number)?.toFixed?.(0) ?? e['amount']} (${e['hitTier']})`;
    case 'heal': return `heal ${(e['amount'] as number)?.toFixed?.(0) ?? e['amount']}`;
    case 'skill_cast': return `cast ${e['skillId']} (${e['hitTier']})`;
    case 'unit_died': return `${e['unitId']} died`;
    case 'status_applied': return `${e['statusKind']} → ${e['targetUnitId']}`;
    case 'status_expired': return `${e['statusKind']} expired`;
    case 'status_tick': return `${e['statusKind']} tick ${(e['amount'] as number)?.toFixed?.(0) ?? e['amount']}`;
    case 'battle_ended': return `BATTLE ${(e['result'] as string)?.toUpperCase()}`;
    case 'battle_started': return 'battle started';
    case 'ct_shift': return `CT shift ${e['delta']}`;
    case 'effect_stub': return `${e['kind']} (stub)`;
    default: return e.type;
  }
}

export function BattleScreen({ navigation }: Props) {
  const runId = useRunStore((state) => state.runId);
  const seed = useRunStore((state) => state.seed);
  const stage = useRunStore((state) => state.stage);
  const activeClassId = useRunStore((state) => state.activeClassId);
  const runStatus = useRunStore((state) => state.status);
  const runError = useRunStore((state) => state.error);
  const submitStageOutcome = useRunStore((state) => state.submitStageOutcome);
  const endRunAction = useRunStore((state) => state.endRun);

  const combatStatus = useCombatStore((state) => state.status);
  const combatError = useCombatStore((state) => state.error);
  const report = useCombatStore((state) => state.report);
  const engineState = useCombatStore((state) => state.engine?.state ?? null);
  const preparedStageIndex = useCombatStore((state) => state.prepared?.stageIndex ?? null);
  const beginInteractive = useCombatStore((state) => state.beginInteractive);
  const tickAdvance = useCombatStore((state) => state.tickAdvance);
  const stepCombat = useCombatStore((state) => state.step);
  const autoPlayToFinish = useCombatStore((state) => state.autoPlayToFinish);
  const clearCombat = useCombatStore((state) => state.clear);

  const player = useCombatStore(selectPlayerUnit);
  const enemies = useCombatStore(selectAliveEnemies);
  const readyUnitId = useCombatStore(selectReadyUnitId);

  const [autoPlay, setAutoPlay] = useState(false);
  const [targetId, setTargetId] = useState<InstanceId | null>(null);
  const [lastReason, setLastReason] = useState<string | null>(null);

  const stageType: StageType = stage !== null ? (STAGE_TYPES[stage] ?? 'normal') : 'normal';
  const classData = activeClassId ? CLASS_BY_ID.get(activeClassId as ClassId) : null;
  const battleEnded = engineState !== null && engineState.result !== 'ongoing';
  const playerReady = player !== null && readyUnitId === player.id;

  // Bounce out if there's no active run.
  useEffect(() => {
    if (runId === null) navigation.replace('MainTabs');
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
      beginInteractive({ seed, stageIndex: stage, activeClassId: activeClassId as ClassId });
    }
  }, [activeClassId, beginInteractive, combatStatus, preparedStageIndex, runId, seed, stage]);

  // Auto-default targeting to the first alive enemy.
  useEffect(() => {
    if (enemies.length === 0) {
      if (targetId !== null) setTargetId(null);
      return;
    }
    const stillAlive = targetId !== null && enemies.some((e) => e.id === targetId);
    if (!stillAlive) setTargetId(enemies[0]?.id ?? null);
  }, [enemies, targetId]);

  // Enemy AI: when a non-player unit is ready, auto-step them with a basic attack on the player.
  useEffect(() => {
    if (engineState === null || battleEnded) return;
    if (readyUnitId === null) {
      // No one ready — advance simulated time by one tick.
      const t = setTimeout(() => tickAdvance(), 50);
      return () => clearTimeout(t);
    }
    if (player !== null && readyUnitId !== player.id) {
      // It's an enemy's turn. Auto-attack the player.
      const t = setTimeout(() => {
        stepCombat({ kind: 'basic_attack', unitId: readyUnitId, targetId: player.id });
      }, 250);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [battleEnded, engineState, player, readyUnitId, stepCombat, tickAdvance]);

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
      navigation.navigate('RewardResolution');
    } catch {
      // Surfaced by run store.
    }
  };

  const handleAutoPlay = () => {
    try {
      autoPlayToFinish();
    } catch {
      // Surfaced by store.
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
                navigation.replace('MainTabs');
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

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      {stage !== null && (
        <View style={[styles.stageBanner, { backgroundColor: STAGE_TYPE_BG[stageType], borderColor: STAGE_TYPE_COLORS[stageType] }]}>
          <View style={styles.stageBannerRow}>
            <Text style={[styles.stageNum, { color: STAGE_TYPE_COLORS[stageType] }]}>Stage {stage}</Text>
            <View style={[styles.stageTypeBadge, { backgroundColor: STAGE_TYPE_COLORS[stageType] }]}>
              <Text style={styles.stageTypeBadgeText}>{STAGE_TYPE_LABELS[stageType]}</Text>
            </View>
            <View style={styles.autoPlayToggle}>
              <Text style={styles.autoPlayLabel}>Auto-play</Text>
              <Switch
                value={autoPlay}
                onValueChange={(v) => {
                  setAutoPlay(v);
                  if (v && !battleEnded) handleAutoPlay();
                }}
              />
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('RunMap')} style={styles.mapLink}>
            <Text style={styles.mapLinkText}>View Map →</Text>
          </TouchableOpacity>
        </View>
      )}

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
            <Button
              title={runStatus === 'submitting_outcome' ? 'Submitting…' : 'Submit & Continue'}
              onPress={() => { handleSubmit().catch(() => undefined); }}
              disabled={runStatus === 'submitting_outcome'}
            />
          </View>
        </View>
      )}

      {/* Event log */}
      {engineState !== null && <EventLog events={engineState.log} />}

      {/* Forfeit Run — visible while a run is active and not already settled */}
      {!battleEnded && runId !== null && runStatus !== 'ending_run' && (
        <View style={styles.forfeitContainer}>
          <TouchableOpacity onPress={handleForfeit} style={styles.forfeitBtn}>
            <Text style={styles.forfeitBtnText}>Forfeit Run</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Debug actions */}
      <View style={styles.actions}>
        <Button title="Clear Battle" onPress={clearCombat} disabled={combatStatus === 'simulating'} />
      </View>
    </ScrollView>
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
  enemyRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dadde9',
    backgroundColor: '#fafbff',
    padding: 10,
    gap: 6,
  },
  enemyRowReady: { borderColor: '#c08020', backgroundColor: '#fffaf0' },
  enemyRowTarget: { borderColor: '#c04040', backgroundColor: '#fff5f5', borderWidth: 1.5 },
  enemyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  enemyName: { fontSize: 14, fontWeight: '600', color: '#2a2e44' },

  abilitiesSection: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cfd3e9',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 6,
  },
  abilitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  abilityBtn: {
    minWidth: 100,
    flexGrow: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7a3b00',
    backgroundColor: '#7a3b00',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  abilityBtnDisabled: { backgroundColor: '#e6e6ea', borderColor: '#bbb' },
  abilityBtnLabel: { fontSize: 13, color: '#fff', fontWeight: '600' },
  abilityBtnLabelDisabled: { color: '#888' },
  abilityBtnCost: { fontSize: 10, color: '#ffd9a0' },
  abilityBtnCostDisabled: { color: '#aaa' },
  abilityBtnCooldown: { fontSize: 10, color: '#ffd9a0', fontStyle: 'italic' },
  abilityBtnReason: { fontSize: 10, color: '#a04040', fontStyle: 'italic' },
  lastReason: { fontSize: 11, color: '#8b1a1a', marginTop: 4 },

  waitingCard: {
    borderRadius: 8,
    backgroundColor: '#f0eef8',
    padding: 10,
    alignItems: 'center',
  },
  waitingText: { fontSize: 12, color: '#5a5a78', fontStyle: 'italic' },

  barContainer: { gap: 2 },
  barTrack: { height: 8, backgroundColor: '#e0e6f0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%' },
  barLabel: { fontSize: 10, color: '#5a5a78' },

  ctChip: {
    fontSize: 11,
    color: '#5a5a78',
    backgroundColor: '#eef0f8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  ctChipReady: {
    color: '#fff',
    backgroundColor: '#3a8a5a',
  },

  statusChipsRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  statusChip: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  statusChipText: { fontSize: 10, fontWeight: '600' },

  eventLog: {
    borderRadius: 10,
    backgroundColor: '#1d212e',
    padding: 10,
    gap: 2,
  },
  eventLogTitle: { fontSize: 11, fontWeight: '700', color: '#9aa0c0', marginBottom: 2 },
  eventLogLine: { fontSize: 11, color: '#d0d4e8', fontFamily: 'monospace' },

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
