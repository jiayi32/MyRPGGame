import {
  BOSS_BY_ID,
  CLASS_BY_ID,
  ENEMY_ARCHETYPE_BY_ID,
  isSpecified,
  SKILL_BY_ID,
  lookupGearTemplate,
  type ClassId,
  type SkillId,
} from '@/content';
import {
  buildBossUnit,
  buildEnemyUnit,
  buildPlayerUnit,
  createEngine,
  toInstanceId,
  type CombatEngine,
  type ResolvedStats,
  type StatusInstance,
  type Unit,
} from '@/domain/combat';
import { selectStage } from '@/domain/run/director';
import { collectSynergyTags, resolveSynergyBonuses, type ActiveSynergy } from '@/domain/run/synergy';
import type { RewardBundle as DomainRewardBundle, StageRoomType } from '@/domain/run/types';
import {
  EMPTY_REWARD_BUNDLE,
  type RewardBundle,
  type StageOutcomeResult,
} from './types';

export interface StageSimulationInput {
  seed: number;
  stageIndex: number;
  activeClassId: ClassId;
  roomType?: StageRoomType;
  roomNodeId?: string;
  classRank?: number;
  equippedGearTemplateIds?: readonly string[];
  selectedRiskContractIds?: readonly string[];
  runPassiveIds?: readonly string[];
  draftedSkillIds?: readonly SkillId[];
  augmentIds?: readonly string[];
  pendingInnDecisionId?: string | null;
  conditionId?: string | undefined;
}

const CONTRACT_BARRIER_SKILL_ID = '__contract.barrier_pulse';

/** Small barrier pulse applied to all enemies when Fortified Hostile contract is active. */
const BARRIER_MAGNITUDE = 12;
const BARRIER_DURATION_SEC = 15;

const applyContractBarriers = (
  engine: CombatEngine,
  contractIds: readonly string[],
): CombatEngine => {
  if (!contractIds.includes('contract.enemy_barrier_tick')) return engine;

  const state = engine.state;
  let nextState = state;

  for (const unit of Object.values(state.units)) {
    if (unit.team !== 'enemy') continue;

    const barrier: StatusInstance = {
      id: toInstanceId(`contract_barrier_${unit.id}`),
      kind: 'shield',
      sourceUnitId: toInstanceId('__contract_source'),
      skillId: CONTRACT_BARRIER_SKILL_ID,
      snapshot: {
        magnitude: BARRIER_MAGNITUDE,
        magnitudeUnit: 'flat',
        sourceStrength: 0,
        sourceIntellect: 0,
        sourceAgility: 0,
      },
      remainingSec: BARRIER_DURATION_SEC,
      stacks: 1,
      tickIntervalSec: 1,
      secSinceLastTick: 0,
      tags: ['contract'],
    };

    const patched: Unit = {
      ...unit,
      statuses: [...unit.statuses, barrier],
    };

    nextState = {
      ...nextState,
      units: { ...nextState.units, [unit.id]: patched },
    };
  }

  return engine.withState(nextState);
};

const applyPassiveEffects = (
  engine: CombatEngine,
  passiveIds: readonly string[],
): CombatEngine => {
  if (passiveIds.length === 0) return engine;

  const state = engine.state;
  let nextState = state;

  for (const unit of Object.values(state.units)) {
    if (unit.team !== 'player') continue;

    let hpMultiplier = 1;
    let ctGainMultiplier = 1;

    if (passiveIds.includes('passive.vanguard_heart')) {
      hpMultiplier = 1.1;
    }
    if (passiveIds.includes('passive.arc_flux')) {
      ctGainMultiplier = 0.92;
    }

    if (hpMultiplier !== 1 || ctGainMultiplier !== 1) {
      const newHpMax = Math.round(unit.hpMax * hpMultiplier);
      const hpChange = newHpMax - unit.hpMax;
      const patched: Unit = {
        ...unit,
        hp: Math.max(1, unit.hp + hpChange),
        hpMax: newHpMax,
        baseStats: {
          ...unit.baseStats,
          ctReductionPct: Math.min(0.5, unit.baseStats.ctReductionPct + (1 - ctGainMultiplier)),
        },
      };

      nextState = {
        ...nextState,
        units: { ...nextState.units, [unit.id]: patched },
      };
    }
  }

  return engine.withState(nextState);
};

const applySynergyBonuses = (
  engine: CombatEngine,
  synergies: readonly ActiveSynergy[],
): CombatEngine => {
  if (synergies.length === 0) return engine;

  const state = engine.state;
  let nextState = state;

  for (const unit of Object.values(state.units)) {
    if (unit.team !== 'player') continue;

    const stats = { ...unit.baseStats };

    for (const syn of synergies) {
      switch (syn.tag) {
        case 'fire':
          stats.strength = Math.round(stats.strength * 1.15);
          stats.intellect = Math.round(stats.intellect * 1.15);
          stats.critChance = Math.min(0.75, stats.critChance + 0.05);
          break;
        case 'frost':
          stats.intellect = Math.round(stats.intellect * 1.1);
          break;
        case 'shadow':
          stats.critChance = Math.min(0.75, stats.critChance + 0.05);
          break;
        case 'light':
          stats.stamina = Math.round(stats.stamina * 1.1);
          break;
        case 'physical':
          stats.strength = Math.round(stats.strength * 1.12);
          stats.critMultiplier = stats.critMultiplier + 0.05;
          break;
        case 'arcane':
          stats.intellect = Math.round(stats.intellect * 1.1);
          break;
        default:
          break;
      }
    }

    const patched: Unit = {
      ...unit,
      baseStats: stats,
    };

    nextState = {
      ...nextState,
      units: { ...nextState.units, [unit.id]: patched },
    };
  }

  return engine.withState(nextState);
};

/**
 * Apply augment effects to the combat engine.
 * Neutral augments (map/economy effects) are no-ops for now — deferred to P4.4.
 * Only Positive and Sacrificial augments with combat stat effects are implemented here.
 */
const applyAugmentEffects = (
  engine: CombatEngine,
  augmentIds: readonly string[],
): CombatEngine => {
  if (augmentIds.length === 0) return engine;

  const state = engine.state;
  let nextState = state;

  for (const unit of Object.values(state.units)) {
    if (unit.team !== 'player') continue;

    let hpMultiplier = 1;
    let damageMultiplier = 1;
    let damageTakenMultiplier = 1;
    let ctReductionBonus = 0;
    let critChanceBonus = 0;
    let critDamageBonus = 0;
    let defenseBonus = 0;
    let allStatsMultiplier = 1;
    let healingReceivedMultiplier = 1;

    // Accumulate multipliers from all active augments
    for (const augId of augmentIds) {
      switch (augId) {
        // -- Bronze Positive --
        case 'augment.bronze.hardy':
          hpMultiplier *= 1.08;
          break;
        case 'augment.bronze.swift':
          ctReductionBonus += 0.05;
          break;
        case 'augment.bronze.focused':
          critChanceBonus += 0.08;
          break;
        // -- Bronze Sacrificial --
        case 'augment.bronze.glass_cannon':
          damageMultiplier *= 1.20;
          hpMultiplier *= 0.85;
          break;
        case 'augment.bronze.berserkers_gambit':
          critDamageBonus += 0.15;
          // -10% all resistances → reduce defense/magicDefense
          defenseBonus -= 0.10;
          break;
        // -- Silver Positive --
        case 'augment.silver.fortified':
          hpMultiplier *= 1.15;
          defenseBonus += 0.10;
          break;
        case 'augment.silver.accelerated':
          ctReductionBonus += 0.10;
          break;
        // -- Silver Sacrificial --
        case 'augment.silver.blood_magic':
          healingReceivedMultiplier *= 0.80;
          // +25% spell damage applied as overall damage (simplification)
          damageMultiplier *= 1.25;
          break;
        case 'augment.silver.cursed_athame':
          critChanceBonus += 0.25;
          hpMultiplier *= 0.85;
          defenseBonus -= 0.10;
          break;
        // -- Gold Positive --
        case 'augment.gold.ascendant':
          allStatsMultiplier *= 1.20;
          break;
        case 'augment.gold.dual_wielder':
          damageMultiplier *= 1.10;
          break;
        // -- Gold Sacrificial --
        case 'augment.gold.phoenix_pact':
          hpMultiplier *= 0.75;
          break;
        // -- Prismatic Positive --
        case 'augment.prismatic.godlike':
          allStatsMultiplier *= 1.30;
          ctReductionBonus += 0.15;
          break;
        // -- Prismatic Sacrificial --
        case 'augment.prismatic.double_edged':
          damageMultiplier *= 2.0;
          damageTakenMultiplier *= 2.0;
          break;
        case 'augment.prismatic.forbidden_knowledge':
          hpMultiplier *= 0.70;
          allStatsMultiplier *= 0.80;
          break;
        // Neutral, Last Stand, Lifestealer, Unstable Power, Untouchable,
        // Soul Bond, Overload, Second Wind, Perfect Form, Apocalypse Engine
        // — deferred or handled separately.
        default:
          break;
      }
    }

    if (
      hpMultiplier === 1 &&
      damageMultiplier === 1 &&
      damageTakenMultiplier === 1 &&
      ctReductionBonus === 0 &&
      critChanceBonus === 0 &&
      critDamageBonus === 0 &&
      defenseBonus === 0 &&
      allStatsMultiplier === 1 &&
      healingReceivedMultiplier === 1
    ) {
      continue; // No stat changes for this unit
    }

    const newHpMax = Math.round(unit.hpMax * hpMultiplier);
    const hpChange = newHpMax - unit.hpMax;

    const stats = { ...unit.baseStats };

    if (allStatsMultiplier !== 1) {
      stats.strength = Math.round(stats.strength * allStatsMultiplier);
      stats.intellect = Math.round(stats.intellect * allStatsMultiplier);
      stats.agility = Math.round(stats.agility * allStatsMultiplier);
      stats.stamina = Math.round(stats.stamina * allStatsMultiplier);
    }

    if (ctReductionBonus !== 0) {
      stats.ctReductionPct = Math.min(0.5, stats.ctReductionPct + ctReductionBonus);
    }

    if (critChanceBonus !== 0) {
      stats.critChance = Math.min(0.75, stats.critChance + critChanceBonus);
    }

    if (critDamageBonus !== 0) {
      stats.critMultiplier = stats.critMultiplier + critDamageBonus;
    }

    if (defenseBonus !== 0) {
      stats.defense = Math.round(stats.defense * (1 + defenseBonus));
      stats.magicDefense = Math.round(stats.magicDefense * (1 + defenseBonus));
    }

    const patched: Unit = {
      ...unit,
      hp: Math.max(1, unit.hp + hpChange),
      hpMax: newHpMax,
      baseStats: stats,
    };

    nextState = {
      ...nextState,
      units: { ...nextState.units, [unit.id]: patched },
    };
  }

  return engine.withState(nextState);
};

/**
 * Apply an inn decision effect to the player unit at battle start.
 * The decision is consumed on use — subsequent prepareStage calls without
 * a new inn decision will not re-apply the effect.
 */
const applyInnDecision = (
  engine: CombatEngine,
  decisionId: string | null | undefined,
): CombatEngine => {
  if (decisionId === null || decisionId === undefined || decisionId.length === 0) {
    return engine;
  }

  const state = engine.state;
  let nextState = state;

  for (const unit of Object.values(state.units)) {
    if (unit.team !== 'player') continue;

    switch (decisionId) {
      case 'inn.recover': {
        const healAmount = Math.round(unit.hpMax * 0.25);
        const patched: Unit = {
          ...unit,
          hp: Math.min(unit.hpMax, unit.hp + healAmount),
        };
        nextState = {
          ...nextState,
          units: { ...nextState.units, [unit.id]: patched },
        };
        break;
      }
      case 'inn.cleanse': {
        // Remove the first negative (debuff) status instance.
        const negativeStatuses = unit.statuses.filter(
          (s) => s.kind !== 'shield' && s.kind !== 'buff',
        );
        if (negativeStatuses.length > 0) {
          const toRemove = negativeStatuses[0];
          if (toRemove !== undefined) {
            const patched: Unit = {
              ...unit,
              statuses: unit.statuses.filter((s) => s.id !== toRemove.id),
            };
            nextState = {
              ...nextState,
              units: { ...nextState.units, [unit.id]: patched },
            };
          }
        }
        break;
      }
      case 'inn.focus': {
        const stats = { ...unit.baseStats };
        stats.ctReductionPct = Math.min(0.5, stats.ctReductionPct + 0.10);
        const patched: Unit = {
          ...unit,
          baseStats: stats,
        };
        nextState = {
          ...nextState,
          units: { ...nextState.units, [unit.id]: patched },
        };
        break;
      }
      default:
        break;
    }
  }

  return engine.withState(nextState);
};

/**
 * Apply a room condition modifier to the combat engine.
 * Conditions are deterministic per node — same seed + stage + nodeId → same condition.
 */
const applyStageCondition = (
  engine: CombatEngine,
  conditionId: string | undefined,
): CombatEngine => {
  if (conditionId === undefined || conditionId.length === 0) return engine;

  const state = engine.state;
  let nextState = state;

  for (const unit of Object.values(state.units)) {
    switch (conditionId) {
      case 'condition.fortified': {
        // Enemy HP +15%
        if (unit.team === 'enemy') {
          const newHpMax = Math.round(unit.hpMax * 1.15);
          const hpChange = newHpMax - unit.hpMax;
          const patched: Unit = {
            ...unit,
            hp: unit.hp + hpChange,
            hpMax: newHpMax,
          };
          nextState = {
            ...nextState,
            units: { ...nextState.units, [unit.id]: patched },
          };
        }
        break;
      }
      case 'condition.cursed': {
        // Player -10% all stats
        if (unit.team === 'player') {
          const stats = { ...unit.baseStats };
          stats.strength = Math.round(stats.strength * 0.9);
          stats.intellect = Math.round(stats.intellect * 0.9);
          stats.agility = Math.round(stats.agility * 0.9);
          stats.stamina = Math.round(stats.stamina * 0.9);
          const patched: Unit = { ...unit, baseStats: stats };
          nextState = {
            ...nextState,
            units: { ...nextState.units, [unit.id]: patched },
          };
        }
        break;
      }
      case 'condition.swift': {
        // All units +15% CT speed
        const stats = { ...unit.baseStats };
        stats.ctReductionPct = Math.min(0.5, stats.ctReductionPct + 0.15);
        const patched: Unit = { ...unit, baseStats: stats };
        nextState = {
          ...nextState,
          units: { ...nextState.units, [unit.id]: patched },
        };
        break;
      }
      case 'condition.barrier_pulse': {
        // Enemies start with 8 HP barrier
        if (unit.team === 'enemy') {
          const barrier: StatusInstance = {
            id: toInstanceId(`condition_barrier_${unit.id}`),
            kind: 'shield',
            sourceUnitId: toInstanceId('__condition_source'),
            skillId: '__condition.barrier_pulse',
            snapshot: {
              magnitude: 8,
              magnitudeUnit: 'flat',
              sourceStrength: 0,
              sourceIntellect: 0,
              sourceAgility: 0,
            },
            remainingSec: 15,
            stacks: 1,
            tickIntervalSec: 1,
            secSinceLastTick: 0,
            tags: ['condition'],
          };
          const patched: Unit = {
            ...unit,
            statuses: [...unit.statuses, barrier],
          };
          nextState = {
            ...nextState,
            units: { ...nextState.units, [unit.id]: patched },
          };
        }
        break;
      }
      // Exposed, Treasure Cache, Merchant's Favor, Restful:
      // — Exposed: damage multiplier handled via reward/report layer
      // — Treasure Cache: handled via reward resolution
      // — Merchant's Favor: handled via shop logic
      // — Restful: handled via inn decision doubling
      default:
        break;
    }
  }

  return engine.withState(nextState);
};

export interface StageSimulationReport {
  stageIndex: number;
  encounterId: string;
  roomType?: StageRoomType;
  roomNodeId?: string;
  encounterTemplateId?: string;
  encounterTags?: readonly string[];
  anomalyId?: string;
  anomalyKind?: string;
  battleResult: 'won' | 'lost' | 'draw';
  outcomeResult: StageOutcomeResult;
  claimedRewards: RewardBundle;
  hpRemaining: number;
  elapsedSeconds: number;
  tickCount: number;
  logLength: number;
  enemyCount: number;
  activeSynergies?: readonly ActiveSynergy[];
}

/** Result of preparing a stage for combat — engine + metadata for both auto-play and interactive modes. */
export interface PreparedStage {
  stageIndex: number;
  encounterId: string;
  roomType?: StageRoomType;
  roomNodeId?: string;
  encounterTemplateId?: string;
  encounterTags?: readonly string[];
  anomalyId?: string;
  anomalyKind?: string;
  enemyCount: number;
  rewards: RewardBundle;
  engine: CombatEngine;
  playerUnitId: string;
  activeSynergies?: readonly ActiveSynergy[];
}

const toMutableReward = (reward: DomainRewardBundle): RewardBundle => ({
  gold: reward.gold,
  ascensionCells: reward.ascensionCells,
  sigilShards: 0,
  xpScrollMinor: reward.xpScrollMinor,
  xpScrollStandard: reward.xpScrollStandard,
  xpScrollGrand: reward.xpScrollGrand,
  gearIds: [...reward.gearIds],
});

const countEnemies = (entries: readonly { count: number }[]): number =>
  entries.reduce((sum, e) => sum + e.count, 0);

const outcomeFromBattle = (
  battleResult: 'won' | 'lost' | 'draw' | 'ongoing',
): StageOutcomeResult => (battleResult === 'won' ? 'won' : 'lost');

type MutableOverlay = {
  strength: number;
  intellect: number;
  agility: number;
  stamina: number;
  defense: number;
  magicDefense: number;
  speed: number;
  critChance: number;
  critMultiplier: number;
  ctReductionPct: number;
};

const EMPTY_OVERLAY: MutableOverlay = {
  strength: 0,
  intellect: 0,
  agility: 0,
  stamina: 0,
  defense: 0,
  magicDefense: 0,
  speed: 0,
  critChance: 0,
  critMultiplier: 0,
  ctReductionPct: 0,
};

const toMutableOverlay = (stats: Partial<ResolvedStats>): MutableOverlay => ({
  strength: stats.strength ?? 0,
  intellect: stats.intellect ?? 0,
  agility: stats.agility ?? 0,
  stamina: stats.stamina ?? 0,
  defense: stats.defense ?? 0,
  magicDefense: stats.magicDefense ?? 0,
  speed: stats.speed ?? 0,
  critChance: stats.critChance ?? 0,
  critMultiplier: stats.critMultiplier ?? 0,
  ctReductionPct: stats.ctReductionPct ?? 0,
});

const mergeOverlay = (
  target: Partial<ResolvedStats>,
  next: Partial<ResolvedStats>,
): Partial<ResolvedStats> => {
  const merged = toMutableOverlay(target);
  const delta = toMutableOverlay(next);
  return {
    strength: merged.strength + delta.strength,
    intellect: merged.intellect + delta.intellect,
    agility: merged.agility + delta.agility,
    stamina: merged.stamina + delta.stamina,
    defense: merged.defense + delta.defense,
    magicDefense: merged.magicDefense + delta.magicDefense,
    speed: merged.speed + delta.speed,
    critChance: merged.critChance + delta.critChance,
    critMultiplier: merged.critMultiplier + delta.critMultiplier,
    ctReductionPct: merged.ctReductionPct + delta.ctReductionPct,
  };
};

const parseGearStats = (stats: unknown): Record<string, number> => {
  if (typeof stats !== 'object' || stats === null) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(stats as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k.toLowerCase()] = v;
  }
  return out;
};

const overlayFromGearStatRecord = (stats: Record<string, number>): Partial<ResolvedStats> => {
  const strength = stats['strength'] ?? 0;
  const intellect = stats['intellect'] ?? 0;
  const constitution = stats['constitution'] ?? 0;
  const dexterity = stats['dexterity'] ?? 0;
  return {
    ...EMPTY_OVERLAY,
    strength,
    intellect,
    stamina: constitution,
    defense: constitution * 0.6,
    magicDefense: constitution * 0.35,
    agility: dexterity,
    speed: dexterity * 0.8,
    critChance: dexterity * 0.0015,
  };
};

const overlayFromEquippedGear = (templateIds: readonly string[] | undefined): Partial<ResolvedStats> => {
  if (templateIds === undefined || templateIds.length === 0) return {};
  let overlay: Partial<ResolvedStats> = {};
  for (const templateId of templateIds) {
    const resolved = lookupGearTemplate(templateId);
    if (!resolved) continue;
    if (
      resolved.source === 'unique' &&
      resolved.item !== undefined &&
      isSpecified(resolved.item.baseStats)
    ) {
      overlay = mergeOverlay(
        overlay,
        overlayFromGearStatRecord(parseGearStats(resolved.item.baseStats)),
      );
    }
    if (
      resolved.source === 'template' &&
      resolved.template !== undefined &&
      isSpecified(resolved.template.baseStatsHint)
    ) {
      overlay = mergeOverlay(
        overlay,
        overlayFromGearStatRecord(parseGearStats(resolved.template.baseStatsHint)),
      );
    }
  }
  return overlay;
};

/**
 * Boss stage reward payouts — sized larger than procedural rewards.
 * Pyre Warden (5): mid-tier; Vortex (10): checkpoint gate, includes ascensionCells; Rimefang (30): apex.
 * Magnitudes are P6 retune candidates.
 */
const resolveBossRewards = (stage: number): RewardBundle => {
  if (stage === 5) {
    return {
      gold: 250,
      ascensionCells: 2,
      sigilShards: 1,
      xpScrollMinor: 2,
      xpScrollStandard: 1,
      xpScrollGrand: 0,
      gearIds: ['dps.t2.weapon'],
    };
  }
  if (stage === 10) {
    return {
      gold: 600,
      ascensionCells: 5,
      sigilShards: 2,
      xpScrollMinor: 1,
      xpScrollStandard: 2,
      xpScrollGrand: 0,
      gearIds: ['hybrid.t3.weapon'],
    };
  }
  // stage 30
  return {
    gold: 1500,
    ascensionCells: 12,
    sigilShards: 0,
    xpScrollMinor: 0,
    xpScrollStandard: 1,
    xpScrollGrand: 2,
    gearIds: ['drakehorn_forge.worldbreaker_fang'],
  };
};

/** Build the engine + encounter metadata for a stage. Handles both procedural encounters and boss stages. */
export const prepareStage = (input: StageSimulationInput): PreparedStage => {
  const classData = CLASS_BY_ID.get(input.activeClassId);
  if (classData === undefined) {
    throw new Error(`Class ${input.activeClassId} not found.`);
  }

  const selection = selectStage({
    seed: input.seed,
    stage: input.stageIndex,
    activeClassId: classData.id,
    activeLineageId: classData.lineageId,
    ...(input.roomType !== undefined ? { roomType: input.roomType } : {}),
    ...(input.roomNodeId !== undefined ? { roomNodeId: input.roomNodeId } : {}),
  });

  const player = buildPlayerUnit(classData, {
    instanceId: 'player_1',
    insertionIndex: 0,
    classRank: input.classRank ?? 0,
    statOverlays: overlayFromEquippedGear(input.equippedGearTemplateIds),
  });

  // Merge drafted skills into the player unit
  const draftedIds = input.draftedSkillIds ?? [];
  const mergedPlayer: Unit = draftedIds.length > 0
    ? { ...player, skillIds: [...player.skillIds, ...draftedIds] }
    : player;

  // Compute synergy bonuses from the player's full build
  const synergyTags = collectSynergyTags(
    input.activeClassId,
    [], // draftedSkillIds — not yet implemented (P4.3)
    input.equippedGearTemplateIds ?? [],
    input.runPassiveIds ?? [],
  );
  const activeSynergies = resolveSynergyBonuses(synergyTags);

  // ------ Boss stage path (5 / 10 / 30) ------
  if (selection.kind === 'boss') {
    if (selection.bossId === undefined) {
      throw new Error(`Boss stage ${input.stageIndex} returned no bossId.`);
    }
    const boss = BOSS_BY_ID.get(selection.bossId);
    if (boss === undefined) {
      throw new Error(`Boss ${selection.bossId} not found in BOSS_BY_ID.`);
    }
    const bossUnit = buildBossUnit(boss, { instanceId: 'boss_1', insertionIndex: 1 });
    const engine = createEngine({
      seed: input.seed,
      units: [mergedPlayer, bossUnit],
      skillLookup: (id) => SKILL_BY_ID.get(id),
    });
    const contractEngine = applyContractBarriers(engine, input.selectedRiskContractIds ?? []);
    const finalEngine = applyPassiveEffects(contractEngine, input.runPassiveIds ?? []);
    const synergyEngine = applySynergyBonuses(finalEngine, activeSynergies);
    const augmentEngine = applyAugmentEffects(synergyEngine, input.augmentIds ?? []);
    const innEngine = applyInnDecision(augmentEngine, input.pendingInnDecisionId);
    const condEngine = applyStageCondition(innEngine, input.conditionId);
    return {
      stageIndex: input.stageIndex,
      encounterId: `boss.${boss.id}`,
      ...(input.roomType !== undefined ? { roomType: input.roomType } : {}),
      ...(input.roomNodeId !== undefined ? { roomNodeId: input.roomNodeId } : {}),
      enemyCount: 1,
      rewards: resolveBossRewards(input.stageIndex),
      engine: augmentEngine,
      playerUnitId: 'player_1',
      ...(activeSynergies.length > 0 ? { activeSynergies } : {}),
    };
  }

  // ------ Procedural encounter path ------
  if (selection.encounter === undefined) {
    throw new Error(`Procedural stage ${input.stageIndex} returned no encounter.`);
  }

  const enemyUnits = selection.encounter.enemies.flatMap((entry, groupIndex) => {
    const archetype = ENEMY_ARCHETYPE_BY_ID.get(entry.archetypeId);
    if (archetype === undefined) {
      throw new Error(`Enemy archetype ${entry.archetypeId} not found.`);
    }
    const groupOffset = groupIndex * 10;
    return Array.from({ length: entry.count }, (_, i) =>
      buildEnemyUnit(archetype, {
        instanceId: `enemy_${groupOffset + i + 1}`,
        tier: entry.tier,
        insertionIndex: groupOffset + i + 1,
      }),
    );
  });

  const engine = createEngine({
    seed: input.seed,
    units: [mergedPlayer, ...enemyUnits],
    skillLookup: (id) => SKILL_BY_ID.get(id),
  });

  const contractEngine = applyContractBarriers(engine, input.selectedRiskContractIds ?? []);
  const finalEngine = applyPassiveEffects(contractEngine, input.runPassiveIds ?? []);
  const synergyEngine = applySynergyBonuses(finalEngine, activeSynergies);
  const augmentEngine = applyAugmentEffects(synergyEngine, input.augmentIds ?? []);
  const innEngine = applyInnDecision(augmentEngine, input.pendingInnDecisionId);
  const condEngine = applyStageCondition(innEngine, input.conditionId);

  return {
    stageIndex: input.stageIndex,
    encounterId: selection.encounter.encounterId,
    roomType: selection.encounter.roomType,
    ...(selection.encounter.roomNodeId !== undefined
      ? { roomNodeId: selection.encounter.roomNodeId }
      : {}),
    encounterTemplateId: selection.encounter.templateId,
    encounterTags: selection.encounter.templateTags,
    ...(selection.encounter.anomalyId !== undefined
      ? { anomalyId: selection.encounter.anomalyId }
      : {}),
    ...(selection.encounter.anomalyKind !== undefined
      ? { anomalyKind: selection.encounter.anomalyKind }
      : {}),
    enemyCount: countEnemies(selection.encounter.enemies),
    rewards: toMutableReward(selection.encounter.rewards),
    engine: augmentEngine,
    playerUnitId: 'player_1',
    ...(activeSynergies.length > 0 ? { activeSynergies } : {}),
  };
};

/** Build a report from a finished or in-progress engine state. Throws if battle is still ongoing. */
export const buildStageReport = (prepared: PreparedStage, engine: CombatEngine): StageSimulationReport => {
  if (engine.state.result === 'ongoing') {
    throw new Error('Cannot build report while battle is ongoing.');
  }
  const playerAfter = Object.values(engine.state.units).find((u) => u.team === 'player');
  const battleResult = engine.state.result === 'draw' ? 'draw' : engine.state.result;
  const outcomeResult = outcomeFromBattle(engine.state.result);
  const claimedRewards =
    outcomeResult === 'won' ? prepared.rewards : { ...EMPTY_REWARD_BUNDLE, gearIds: [] };

  return {
    stageIndex: prepared.stageIndex,
    encounterId: prepared.encounterId,
    ...(prepared.roomType !== undefined ? { roomType: prepared.roomType } : {}),
    ...(prepared.roomNodeId !== undefined ? { roomNodeId: prepared.roomNodeId } : {}),
    ...(prepared.encounterTemplateId !== undefined
      ? { encounterTemplateId: prepared.encounterTemplateId }
      : {}),
    ...(prepared.encounterTags !== undefined ? { encounterTags: prepared.encounterTags } : {}),
    ...(prepared.anomalyId !== undefined ? { anomalyId: prepared.anomalyId } : {}),
    ...(prepared.anomalyKind !== undefined ? { anomalyKind: prepared.anomalyKind } : {}),
    battleResult,
    outcomeResult,
    claimedRewards,
    hpRemaining: Math.max(0, Math.round(playerAfter?.hp ?? 0)),
    elapsedSeconds: Math.max(0, Math.round(engine.state.elapsedSec)),
    tickCount: engine.state.tick,
    logLength: engine.state.log.length,
    enemyCount: prepared.enemyCount,
    ...(prepared.activeSynergies !== undefined && prepared.activeSynergies.length > 0
      ? { activeSynergies: prepared.activeSynergies }
      : {}),
  };
};

/**
 * Auto-play a prepared stage to terminal using basic attacks.
 * Used by the "Auto-play" toggle in BattleScreen and by tests.
 */
export const autoPlayStage = (prepared: PreparedStage): CombatEngine => {
  let engine = prepared.engine;
  let guard = 0;
  while (engine.state.result === 'ongoing' && guard < 3000) {
    guard += 1;

    const ready = engine.ready();
    if (ready === null) {
      engine = engine.advance();
      continue;
    }

    const target = Object.values(engine.state.units).find(
      (unit) => !unit.isDead && unit.team !== ready.team,
    );

    if (target === undefined) {
      break;
    }

    const stepped = engine.step({
      kind: 'basic_attack',
      unitId: ready.id,
      targetId: target.id,
    });

    if (!stepped.result.ok && stepped.result.reason !== 'not_ready') {
      throw new Error(`Combat step failed with reason: ${stepped.result.reason}.`);
    }

    engine = stepped.engine;
  }

  if (engine.state.result === 'ongoing') {
    throw new Error('Combat simulation guard limit reached before terminal result.');
  }

  return engine;
};

/** Backward-compatible one-shot simulation (used by tests + auto-play path). */
export const simulateProceduralStage = (
  input: StageSimulationInput,
): StageSimulationReport => {
  const prepared = prepareStage(input);
  const finishedEngine = autoPlayStage(prepared);
  return buildStageReport(prepared, finishedEngine);
};
