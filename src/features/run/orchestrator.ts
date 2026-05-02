import {
  BOSS_BY_ID,
  CLASS_BY_ID,
  ENEMY_ARCHETYPE_BY_ID,
  isSpecified,
  SKILL_BY_ID,
  lookupGearTemplate,
  type ClassId,
} from '@/content';
import {
  buildBossUnit,
  buildEnemyUnit,
  buildPlayerUnit,
  createEngine,
  type CombatEngine,
  type ResolvedStats,
} from '@/domain/combat';
import { selectStage } from '@/domain/run/director';
import type { RewardBundle as DomainRewardBundle } from '@/domain/run/types';
import {
  EMPTY_REWARD_BUNDLE,
  type RewardBundle,
  type StageOutcomeResult,
} from './types';

export interface StageSimulationInput {
  seed: number;
  stageIndex: number;
  activeClassId: ClassId;
  classRank?: number;
  equippedGearTemplateIds?: readonly string[];
}

export interface StageSimulationReport {
  stageIndex: number;
  encounterId: string;
  battleResult: 'won' | 'lost' | 'draw';
  outcomeResult: StageOutcomeResult;
  claimedRewards: RewardBundle;
  hpRemaining: number;
  elapsedSeconds: number;
  tickCount: number;
  logLength: number;
  enemyCount: number;
}

/** Result of preparing a stage for combat — engine + metadata for both auto-play and interactive modes. */
export interface PreparedStage {
  stageIndex: number;
  encounterId: string;
  enemyCount: number;
  rewards: RewardBundle;
  engine: CombatEngine;
  playerUnitId: string;
}

const toMutableReward = (reward: DomainRewardBundle): RewardBundle => ({
  gold: reward.gold,
  ascensionCells: reward.ascensionCells,
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
  });

  const player = buildPlayerUnit(classData, {
    instanceId: 'player_1',
    insertionIndex: 0,
    classRank: input.classRank ?? 0,
    statOverlays: overlayFromEquippedGear(input.equippedGearTemplateIds),
  });

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
      units: [player, bossUnit],
      skillLookup: (id) => SKILL_BY_ID.get(id),
    });
    return {
      stageIndex: input.stageIndex,
      encounterId: `boss.${boss.id}`,
      enemyCount: 1,
      rewards: resolveBossRewards(input.stageIndex),
      engine,
      playerUnitId: 'player_1',
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
    units: [player, ...enemyUnits],
    skillLookup: (id) => SKILL_BY_ID.get(id),
  });

  return {
    stageIndex: input.stageIndex,
    encounterId: selection.encounter.encounterId,
    enemyCount: countEnemies(selection.encounter.enemies),
    rewards: toMutableReward(selection.encounter.rewards),
    engine,
    playerUnitId: 'player_1',
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
    battleResult,
    outcomeResult,
    claimedRewards,
    hpRemaining: Math.max(0, Math.round(playerAfter?.hp ?? 0)),
    elapsedSeconds: Math.max(0, Math.round(engine.state.elapsedSec)),
    tickCount: engine.state.tick,
    logLength: engine.state.log.length,
    enemyCount: prepared.enemyCount,
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
