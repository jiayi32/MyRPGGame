import {
  BOSS_BY_ID,
  CLASS_BY_ID,
  ENEMY_ARCHETYPE_BY_ID,
  SKILL_BY_ID,
  type ClassId,
} from '@/content';
import {
  buildBossUnit,
  buildEnemyUnit,
  buildPlayerUnit,
  createEngine,
  type CombatEngine,
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

/**
 * Boss stage reward payouts — sized larger than procedural rewards.
 * Pyre Warden (5): mid-tier; Vortex (10): checkpoint gate, includes ascensionCells; Rimefang (30): apex.
 * Magnitudes are P6 retune candidates.
 */
const resolveBossRewards = (stage: number, bossName: string): RewardBundle => {
  const slug = bossName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  if (stage === 5) {
    return {
      gold: 250,
      ascensionCells: 2,
      xpScrollMinor: 2,
      xpScrollStandard: 1,
      xpScrollGrand: 0,
      gearIds: [`gear.boss.${slug}.t2`],
    };
  }
  if (stage === 10) {
    return {
      gold: 600,
      ascensionCells: 5,
      xpScrollMinor: 1,
      xpScrollStandard: 2,
      xpScrollGrand: 0,
      gearIds: [`gear.boss.${slug}.t3`],
    };
  }
  // stage 30
  return {
    gold: 1500,
    ascensionCells: 12,
    xpScrollMinor: 0,
    xpScrollStandard: 1,
    xpScrollGrand: 2,
    gearIds: [`gear.boss.${slug}.t5`],
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
      rewards: resolveBossRewards(input.stageIndex, boss.name),
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
