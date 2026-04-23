import {
  CLASS_BY_ID,
  ENEMY_ARCHETYPE_BY_ID,
  SKILL_BY_ID,
  type ClassId,
} from '@/content';
import { buildEnemyUnit, buildPlayerUnit, createEngine } from '@/domain/combat';
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

export const simulateProceduralStage = (
  input: StageSimulationInput,
): StageSimulationReport => {
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

  if (selection.kind !== 'procedural' || selection.encounter === undefined) {
    throw new Error(
      `MVP stage simulation currently supports procedural stages only, got ${selection.kind}.`,
    );
  }

  const player = buildPlayerUnit(classData, {
    instanceId: 'player_1',
    insertionIndex: 0,
  });

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

  let engine = createEngine({
    seed: input.seed,
    units: [player, ...enemyUnits],
    skillLookup: (id) => SKILL_BY_ID.get(id),
  });

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

  const playerAfter = Object.values(engine.state.units).find((unit) => unit.team === 'player');

  const battleResult = engine.state.result === 'draw' ? 'draw' : engine.state.result;
  const outcomeResult = outcomeFromBattle(engine.state.result);
  const claimedRewards =
    outcomeResult === 'won'
      ? toMutableReward(selection.encounter.rewards)
      : toMutableReward(EMPTY_REWARD_BUNDLE);

  return {
    stageIndex: input.stageIndex,
    encounterId: selection.encounter.encounterId,
    battleResult,
    outcomeResult,
    claimedRewards,
    hpRemaining: Math.max(0, Math.round(playerAfter?.hp ?? 0)),
    elapsedSeconds: Math.max(0, Math.round(engine.state.elapsedSec)),
    tickCount: engine.state.tick,
    logLength: engine.state.log.length,
    enemyCount: countEnemies(selection.encounter.enemies),
  };
};
