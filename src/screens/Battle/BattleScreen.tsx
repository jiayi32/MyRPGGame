import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';
import { ScreenWrapper } from '@/components/atoms/ScreenWrapper';
import { ThemeText } from '@/components/atoms/ThemeText';
import { Card } from '@/components/atoms/Card';
import { Bar, UnitBars } from '@/components/atoms/Bar';
import { StatusChip, StatusChipRow } from '@/components/atoms/StatusChip';
import { AbilityDetailsModal } from '@/components/organisms/AbilityDetailsModal';
import { CastPulse } from '@/components/molecules/CastPulse';
import { DamagePopupOverlay } from '@/components/molecules/DamagePopupOverlay';
import { colors, spacing, radius, typography } from '@/design';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/AppNavigator';
import { CLASS_BY_ID, RUN_PASSIVE_BY_ID, SKILL_BY_ID, AUGMENT_BY_ID, STAGE_CONDITION_BY_ID } from '@/content';
import type { ClassId, SkillId } from '@/content/types';
import { getSelectedNodeForStage, RUN_MAP_ROOM_LABELS } from '@/domain/run/map';
import {
  canCast,
  type Action,
  type CombatEngine,
  type InstanceId,
  SYNTHETIC_BASIC_ATTACK_ID,
} from '@/domain/combat';
import type { StageRoomType } from '@/domain/run/types';
import type { ActiveSynergy } from '@/domain/run/synergy';
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
// Stage type colors now use design tokens inline (see render section)
const STAGE_TYPE_COLOR_MAP: Record<StageType, keyof typeof colors.roomType> = {
  normal: 'normal',
  mini_boss: 'miniBoss',
  gate: 'gateBoss',
  counter: 'counterBoss',
};

const ACTION_DOCK_HEIGHT = 118;

// Room type badges now use design colors.roomType tokens inline (see render)

type ForecastIntent = 'Player' | 'Burst' | 'Sustain' | 'Control' | 'Summon' | 'Basic' | 'Unknown';

interface ForecastEntry {
  readonly unitId: InstanceId;
  readonly unitName: string;
  readonly teamLabel: 'Player' | 'Enemy';
  readonly etaLabel: string;
  readonly intent: ForecastIntent;
  readonly actionLabel: string;
}

const FORECAST_DEPTH = 5;
const FORECAST_DEFAULT_VISIBLE = 3;
const FORECAST_MAX_ITERATIONS = 120;

const FORECAST_INTENT_STYLES: Record<ForecastIntent, { bg: string; fg: string }> = {
  Player: colors.intent.player,
  Burst: colors.intent.burst,
  Sustain: colors.intent.sustain,
  Control: colors.intent.control,
  Summon: colors.intent.summon,
  Basic: colors.intent.basic,
  Unknown: colors.intent.unknown,
};

const FORECAST_INTENT_ICONS: Record<ForecastIntent, string> = {
  Player: 'P',
  Burst: 'B',
  Sustain: 'S',
  Control: 'C',
  Summon: 'U',
  Basic: 'A',
  Unknown: '?',
};

const classifyActionIntent = (action: Action): ForecastIntent => {
  if (action.kind === 'basic_attack') return 'Basic';
  if (action.kind !== 'cast_skill') return 'Unknown';

  const skill = SKILL_BY_ID.get(action.skillId);
  if (skill === undefined) return 'Unknown';

  if (skill.tags.includes('summon')) return 'Summon';

  if (
    skill.tags.includes('control') ||
    skill.tags.includes('ct_manipulation') ||
    skill.tags.includes('debuff') ||
    skill.tags.includes('counter') ||
    skill.tags.includes('knockback') ||
    skill.tags.includes('pull')
  ) {
    return 'Control';
  }

  if (
    skill.tags.includes('sustain') ||
    skill.tags.includes('heal') ||
    skill.tags.includes('buff') ||
    skill.tags.includes('team buff') ||
    skill.tags.includes('dot buff') ||
    skill.tags.includes('life drain') ||
    skill.tags.includes('passive-buff')
  ) {
    return 'Sustain';
  }

  if (
    skill.tags.includes('burst') ||
    skill.tags.includes('execute') ||
    skill.tags.includes('aoe') ||
    skill.tags.includes('multi-hit') ||
    skill.tags.includes('cone') ||
    skill.tags.includes('ultimate') ||
    skill.tags.includes('single-target')
  ) {
    return 'Burst';
  }

  const effectKinds = skill.effects.map((effect) => effect.kind);
  if (effectKinds.includes('summon')) return 'Summon';
  if (
    effectKinds.includes('heal') ||
    effectKinds.includes('hot') ||
    effectKinds.includes('buff') ||
    effectKinds.includes('shield') ||
    effectKinds.includes('cleanse')
  ) {
    return 'Sustain';
  }
  if (
    effectKinds.includes('ct_shift') ||
    effectKinds.includes('debuff') ||
    effectKinds.includes('status') ||
    effectKinds.includes('counter')
  ) {
    return 'Control';
  }
  if (
    effectKinds.includes('damage') ||
    effectKinds.includes('dot') ||
    effectKinds.includes('execute') ||
    effectKinds.includes('lifesteal')
  ) {
    return 'Burst';
  }

  return 'Unknown';
};

const describeForecastAction = (action: Action): string => {
  if (action.kind === 'basic_attack') return 'Basic Attack';
  if (action.kind === 'wait') return 'Wait';
  return SKILL_BY_ID.get(action.skillId)?.name ?? 'Skill';
};

const buildTurnForecast = (
  engine: CombatEngine | null,
  preferredTargetId: InstanceId | null,
): readonly ForecastEntry[] => {
  if (engine === null || engine.state.result !== 'ongoing') return [];

  const output: ForecastEntry[] = [];
  const initialElapsedSec = engine.state.elapsedSec;
  let sim = engine;
  let iterations = 0;

  while (
    output.length < FORECAST_DEPTH &&
    iterations < FORECAST_MAX_ITERATIONS &&
    sim.state.result === 'ongoing'
  ) {
    iterations += 1;

    const ready = sim.ready();
    if (ready === null) {
      sim = sim.advance();
      continue;
    }

    let action: Action;
    if (ready.team === 'enemy') {
      action = decideEnemyAction({
        state: sim.state,
        unitId: ready.id,
        skillLookup: (id) => SKILL_BY_ID.get(id),
      });
    } else {
      const preferredTarget = preferredTargetId !== null ? sim.state.units[preferredTargetId] : undefined;
      const fallbackEnemyId =
        preferredTarget !== undefined && !preferredTarget.isDead && preferredTarget.team === 'enemy'
          ? preferredTarget.id
          : Object.values(sim.state.units).find((unit) => unit.team === 'enemy' && !unit.isDead)?.id ?? null;

      action =
        fallbackEnemyId !== null
          ? { kind: 'basic_attack', unitId: ready.id, targetId: fallbackEnemyId }
          : { kind: 'wait', unitId: ready.id };
    }

    const etaSeconds = Math.max(0, sim.state.elapsedSec - initialElapsedSec);
    const etaLabel = etaSeconds < 0.5 ? 'Now' : `+${Math.max(1, Math.round(etaSeconds))}s`;

    output.push({
      unitId: ready.id,
      unitName: ready.displayName,
      teamLabel: ready.team === 'player' ? 'Player' : 'Enemy',
      etaLabel,
      intent: ready.team === 'player' ? 'Player' : classifyActionIntent(action),
      actionLabel: ready.team === 'player' ? 'Choose action' : describeForecastAction(action),
    });

    const stepped = sim.step(action);
    sim = stepped.engine;

    if (!stepped.result.ok && action.kind !== 'wait') {
      const waitStep = sim.step({ kind: 'wait', unitId: ready.id });
      sim = waitStep.engine;
    }
  }

  return output;
};

export function BattleScreen({ navigation }: Props) {
  const runId = useRunStore((state) => state.runId);
  const seed = useRunStore((state) => state.seed);
  const stage = useRunStore((state) => state.stage);
  const mapGraph = useRunStore((state) => state.mapGraph);
  const mapPathByStage = useRunStore((state) => state.mapPathByStage);
  const activeClassId = useRunStore((state) => state.activeClassId);
  const selectedRiskContractIds = useRunStore((state) => state.selectedRiskContractIds);
  const runPassiveIds = useRunStore((state) => state.runPassiveIds);
  const draftedSkillIds = useRunStore((state) => state.draftedSkillIds);
  const augmentIds = useRunStore((state) => state.augmentIds);
  const pendingInnDecisionId = useRunStore((state) => state.pendingInnDecisionId);
  const clearInnDecision = useRunStore((state) => state.clearInnDecision);
  const runStatus = useRunStore((state) => state.status);
  const runError = useRunStore((state) => state.error);
  const submitStageOutcome = useRunStore((state) => state.submitStageOutcome);
  const endRunAction = useRunStore((state) => state.endRun);
  const classRanks = usePlayerStore((state) => state.classRanks);
  const { equippedBySlot } = useGearInventory();

  const combatStatus = useCombatStore((state) => state.status);
  const combatError = useCombatStore((state) => state.error);
  const report = useCombatStore((state) => state.report);
  const engine = useCombatStore((state) => state.engine);
  const engineState = useCombatStore((state) => state.engine?.state ?? null);
  const preparedStageIndex = useCombatStore((state) => state.prepared?.stageIndex ?? null);
  const preparedRoomNodeId = useCombatStore((state) => state.prepared?.roomNodeId ?? null);
  const activeSynergies = useCombatStore((state) => state.prepared?.activeSynergies ?? null);
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
  const [expandedForecast, setExpandedForecast] = useState(false);
  const [showEventLog, setShowEventLog] = useState(false);

  const currentStageNode = useMemo(() => {
    if (mapGraph === null || stage === null) return null;
    return getSelectedNodeForStage(mapGraph, mapPathByStage, stage);
  }, [mapGraph, mapPathByStage, stage]);

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
  const roomBadge =
    currentStageNode !== null
      ? {
          label: RUN_MAP_ROOM_LABELS[currentStageNode.roomType],
          roomType: currentStageNode.roomType,
        }
      : null;

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
    if (mapGraph === null) {
      return;
    }
    if (currentStageNode === null) {
      navigation.replace('RunMap');
      return;
    }
    const needsFreshSetup =
      combatStatus === 'idle' ||
      preparedStageIndex !== stage ||
      preparedRoomNodeId !== currentStageNode.id;
    if (needsFreshSetup) {
      beginInteractive({
        seed,
        stageIndex: stage,
        activeClassId: activeClassId as ClassId,
        roomType: currentStageNode.roomType,
        roomNodeId: currentStageNode.id,
        classRank,
        equippedGearTemplateIds,
        selectedRiskContractIds,
        runPassiveIds,
        draftedSkillIds,
        augmentIds,
        pendingInnDecisionId,
        conditionId: currentStageNode.condition,
      });
      if (pendingInnDecisionId !== null) {
        clearInnDecision();
      }
    }
  }, [
    activeClassId,
    beginInteractive,
    classRank,
    clearInnDecision,
    combatStatus,
    draftedSkillIds,
    augmentIds,
    pendingInnDecisionId,
    equippedGearTemplateIds,
    currentStageNode,
    mapGraph,
    navigation,
    preparedStageIndex,
    preparedRoomNodeId,
    runId,
    runPassiveIds,
    seed,
    selectedRiskContractIds,
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
      'This ends the run as fled. Banked and vaulted rewards are secured, but progression is reduced (no lineage rank gain or same-lineage tier-up unlock).',
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

  const turnForecast = useMemo(() => buildTurnForecast(engine, targetId), [engine, targetId]);
  const visibleForecast = useMemo(
    () =>
      expandedForecast
        ? turnForecast
        : turnForecast.slice(0, Math.min(FORECAST_DEFAULT_VISIBLE, turnForecast.length)),
    [expandedForecast, turnForecast],
  );

  const stageRoomColorKey = STAGE_TYPE_COLOR_MAP[stageType];
  const stageColors = colors.roomType[stageRoomColorKey];

  return (
    <ScreenWrapper mode="dark" padded={false}>
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={[styles.container, !battleEnded && styles.containerWithDock]}
    >
      {stage !== null && (
        <View style={[styles.stageBanner, { backgroundColor: stageColors.bg, borderColor: stageColors.border }]}>
          <View style={styles.stageBannerRow}>
            <Text style={[styles.stageNum, { color: stageColors.text }]}>Stage {stage}</Text>
            <View style={[styles.stageTypeBadge, { backgroundColor: stageColors.text }]}>
              <Text style={styles.stageTypeBadgeText}>{STAGE_TYPE_LABELS[stageType]}</Text>
            </View>
            {roomBadge !== null && (() => {
              const rbColors = colors.roomType[roomBadge.roomType === 'mini_boss' ? 'miniBoss' : roomBadge.roomType === 'gate' ? 'gateBoss' : roomBadge.roomType === 'counter' ? 'counterBoss' : roomBadge.roomType];
              return (
                <View style={[styles.roomTypeBadge, { backgroundColor: rbColors.bg }]}> 
                  <Text style={[styles.roomTypeBadgeText, { color: rbColors.text }]}>
                    {roomBadge.label}
                  </Text>
                </View>
              );
            })()}
            {currentStageNode?.condition !== undefined && (() => {
              const condDef = STAGE_CONDITION_BY_ID.get(currentStageNode.condition);
              if (condDef === undefined) return null;
              return (
                <View style={styles.conditionBadge}>
                  <Text style={styles.conditionBadgeText} numberOfLines={1}>
                    {condDef.name}
                  </Text>
                </View>
              );
            })()}
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

      {!battleEnded && (
        <View style={styles.quickToolsRow}>
          <Pressable onPress={() => setShowEventLog((v) => !v)} style={styles.quickToolChip}>
            <Text style={styles.quickToolChipText}>{showEventLog ? 'Hide Log' : 'Show Log'}</Text>
          </Pressable>
          <Text style={styles.quickTargetText} numberOfLines={1}>
            Target: {selectedTarget?.displayName ?? 'None'}
          </Text>
        </View>
      )}

      {/* AUTO PLAYING strip — extra-large tap target while auto is on, also disables */}
      {autoPlay && !battleEnded && (
        <TouchableOpacity onPress={() => setAutoPlay(false)} style={styles.autoActiveStrip}>
          <Text style={styles.autoActiveStripText}>⚡ AUTO-PLAY ACTIVE — tap to stop</Text>
        </TouchableOpacity>
      )}

      {/* Event log */}
      {engineState !== null && showEventLog && <EventLog events={engineState.log} maxEvents={4} />}

      {/* CT forecast + intent strip */}
      {!battleEnded && turnForecast.length > 0 && (
        <View style={styles.forecastCard}>
          <View style={styles.forecastHeader}>
            <Text style={styles.forecastTitle}>Turn Forecast</Text>
            <View style={styles.forecastHeaderActions}>
              <Text style={styles.forecastHint}>
                Next {visibleForecast.length}/{turnForecast.length}
              </Text>
              {turnForecast.length > FORECAST_DEFAULT_VISIBLE && (
                <Pressable onPress={() => setExpandedForecast((v) => !v)} style={styles.forecastExpandChip}>
                  <Text style={styles.forecastExpandChipText}>{expandedForecast ? 'Collapse' : 'Expand'}</Text>
                </Pressable>
              )}
            </View>
          </View>
          <View style={styles.forecastGrid}>
            {visibleForecast.map((entry, index) => {
              const intentStyle = FORECAST_INTENT_STYLES[entry.intent];
              return (
                <View key={`${entry.unitId}-${index}`} style={styles.forecastRow}>
                  <Text style={styles.forecastEta}>{entry.etaLabel}</Text>
                  <View
                    style={[
                      styles.forecastTeamBadge,
                      entry.teamLabel === 'Player' ? styles.forecastTeamPlayer : styles.forecastTeamEnemy,
                    ]}
                  >
                    <Text style={styles.forecastTeamText}>{entry.teamLabel === 'Player' ? 'P' : 'E'}</Text>
                  </View>
                  <View style={styles.forecastCenter}>
                    <Text style={styles.forecastName} numberOfLines={1}>{entry.unitName}</Text>
                    <Text style={styles.forecastAction} numberOfLines={1}>{entry.actionLabel}</Text>
                  </View>
                  <View style={[styles.forecastIntentBadge, { backgroundColor: intentStyle.bg }]}>
                    <Text style={[styles.forecastIntentIcon, { color: intentStyle.fg }]}>
                      {FORECAST_INTENT_ICONS[entry.intent]}
                    </Text>
                    <Text style={[styles.forecastIntentText, { color: intentStyle.fg }]}>{entry.intent}</Text>
                  </View>
                </View>
              );
            })}
          </View>
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
          <StatusChips unit={player} maxVisible={3} />
          {runPassiveIds.length > 0 && (
            <View style={styles.passiveChipsRow}>
              {runPassiveIds.map((pid) => {
                const def = RUN_PASSIVE_BY_ID.get(pid);
                return (
                  <View key={pid} style={styles.passiveChip}>
                    <Text style={styles.passiveChipText} numberOfLines={1}>
                      {def?.name ?? pid}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          {activeSynergies !== null && activeSynergies.length > 0 && (
            <View style={styles.synergyChipsRow}>
              {activeSynergies.map((syn) => (
                <View key={syn.tag} style={styles.synergyChip}>
                  <Text style={styles.synergyChipText} numberOfLines={1}>
                    {syn.label} ({syn.count})
                  </Text>
                </View>
              ))}
            </View>
          )}
          {augmentIds.length > 0 && (
            <View style={styles.augmentChipsRow}>
              {augmentIds.map((aid) => {
                const def = AUGMENT_BY_ID.get(aid);
                const tierLabel = def?.tier ? def.tier[0]?.toUpperCase() : '?';
                return (
                  <View key={aid} style={styles.augmentChip}>
                    <Text style={styles.augmentChipText} numberOfLines={1}>
                      {def?.name ?? aid}
                    </Text>
                    <View style={styles.augmentTierBadge}>
                      <Text style={styles.augmentTierText}>{tierLabel}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
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
        selectedRiskContractIds.includes('contract.no_forfeit') ? (
          <View style={styles.forfeitContainer}>
            <Text style={styles.forfeitBlockedText}>🚫 No Retreat Oath active — forfeit disabled</Text>
          </View>
        ) : (
          <View style={styles.forfeitContainer}>
            <TouchableOpacity onPress={handleForfeit} style={styles.forfeitBtn}>
              <Text style={styles.forfeitBtnText}>Forfeit Run</Text>
            </TouchableOpacity>
          </View>
        )
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

    {!battleEnded && player !== null && engineState !== null && (
      <View style={styles.actionDock}>
        {playerReady ? (
          <>
            <Text style={styles.actionDockTitle}>Choose Action</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionDockSkillsRow}>
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
                } else if (targetIds.length === 0) {
                  disabled = true;
                  reason = reasonLabel('invalid_target');
                }

                return (
                  <AbilityButton
                    key={skillId}
                    label={label}
                    cost={cost}
                    cooldown={cooldown}
                    compact
                    disabled={disabled}
                    {...(reason !== undefined ? { reason } : {})}
                    onPress={() => handleAbility(skillId)}
                    onLongPress={() => setDetailsSkillId(skillId)}
                  />
                );
              })}
            </ScrollView>
            {lastReason !== null && (
              <Text style={styles.actionDockReason}>Last action: {reasonLabel(lastReason)}</Text>
            )}
          </>
        ) : (
          <Text style={styles.actionDockWaitingText}>
            {readyUnitId === null ? 'Time advancing…' : 'Enemy acting…'}
          </Text>
        )}
      </View>
    )}

    <AbilityDetailsModal
      skillId={detailsSkillId}
      caster={player}
      target={selectedTarget}
      onClose={() => setDetailsSkillId(null)}
    />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: colors.dark.background.primary },
  container: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing['4xl'] },
  containerWithDock: { paddingBottom: ACTION_DOCK_HEIGHT + spacing.xl },
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
  roomTypeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  roomTypeBadgeText: { fontSize: 11, fontWeight: '700' },
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
  quickToolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickToolChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#ccd2e5',
    backgroundColor: '#f5f7fd',
  },
  quickToolChipText: { fontSize: 11, fontWeight: '700', color: '#3e4d73' },
  quickTargetText: { flex: 1, textAlign: 'right', fontSize: 11, color: '#5c6283' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#6a7090', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },

  forecastCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cfd3e9',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 8,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forecastHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  forecastExpandChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d8ec',
    backgroundColor: '#f6f8ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  forecastExpandChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#495a86',
  },
  forecastTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6a7090',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  forecastHint: { fontSize: 11, color: '#8a90ad' },
  forecastGrid: { gap: 6 },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9ff',
    borderWidth: 1,
    borderColor: '#e2e6f4',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  forecastEta: { width: 38, fontSize: 11, fontWeight: '700', color: '#4a5072' },
  forecastTeamBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forecastTeamPlayer: { backgroundColor: '#dff2e5' },
  forecastTeamEnemy: { backgroundColor: '#f8dfdf' },
  forecastTeamText: { fontSize: 11, fontWeight: '800', color: '#253049' },
  forecastCenter: { flex: 1, minWidth: 0, gap: 1 },
  forecastName: { fontSize: 12, fontWeight: '700', color: '#1e2238' },
  forecastAction: { fontSize: 11, color: '#636b8d' },
  forecastIntentBadge: {
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  forecastIntentIcon: { fontSize: 10, fontWeight: '800' },
  forecastIntentText: { fontSize: 10, fontWeight: '700' },

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

  passiveChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  passiveChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#e8f0ff',
    borderWidth: 1,
    borderColor: '#a0b8d8',
  },
  passiveChipText: { fontSize: 10, fontWeight: '600', color: '#2a4a7a' },

  synergyChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  synergyChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#fff3d6',
    borderWidth: 1,
    borderColor: '#d4a248',
  },
  synergyChipText: { fontSize: 10, fontWeight: '600', color: '#805407' },

  augmentChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  augmentChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#f3e5f5',
    borderWidth: 1,
    borderColor: '#9c27b0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  augmentChipText: { fontSize: 10, fontWeight: '600', color: '#6a1b9a' },
  augmentTierBadge: {
    borderRadius: 999,
    backgroundColor: '#9c27b0',
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  augmentTierText: { fontSize: 8, fontWeight: '800', color: '#ffffff' },

  conditionBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#e65100',
  },
  conditionBadgeText: { fontSize: 11, fontWeight: '700', color: '#bf360c' },

  enemiesSection: { gap: 8 },

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
  forfeitBlockedText: { fontSize: 11, color: '#7a684a', fontStyle: 'italic' },
  actionDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: ACTION_DOCK_HEIGHT,
    backgroundColor: colors.dark.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border.default,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  actionDockTitle: { fontSize: 11, fontWeight: '700', color: colors.dark.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  actionDockSkillsRow: { gap: spacing.sm, paddingRight: spacing.sm },
  actionDockReason: { fontSize: 10, color: colors.accent.crimson, fontStyle: 'italic', textAlign: 'center' },
  actionDockWaitingText: { fontSize: 12, color: colors.dark.text.secondary, fontStyle: 'italic', textAlign: 'center', paddingVertical: spacing.lg },
});
