import { sortedTurnOrder } from '../queue';
import { makeBaseStats } from '../stats';
import {
  toInstanceId,
  type BattleState,
  type InstanceId,
  type ResolvedStats,
  type Unit,
} from '../types';

let instanceCounter = 0;
export const newInstanceId = (label: string): InstanceId =>
  toInstanceId(`${label}_${(instanceCounter += 1)}`);

export const resetInstanceCounter = (): void => {
  instanceCounter = 0;
};

export interface UnitSpec {
  readonly id: string;
  readonly team: Unit['team'];
  readonly hp?: number;
  readonly mp?: number;
  readonly ct?: number;
  readonly skillIds?: readonly string[];
  readonly basicAttackSkillId?: string;
  readonly stats?: Partial<ResolvedStats>;
  readonly insertionIndex?: number;
}

export const buildUnit = (spec: UnitSpec): Unit => {
  const hpMax = spec.hp ?? 100;
  const mpMax = spec.mp ?? 20;
  const unit: Unit = {
    id: toInstanceId(spec.id),
    team: spec.team,
    displayName: spec.id,
    hp: hpMax,
    hpMax,
    mp: mpMax,
    mpMax,
    ct: spec.ct ?? 0,
    baseStats: makeBaseStats(spec.stats ?? {}),
    skillIds: spec.skillIds ?? [],
    cooldowns: {},
    statuses: [],
    insertionIndex: spec.insertionIndex ?? 0,
    isDead: false,
  };
  if (spec.basicAttackSkillId !== undefined) {
    return { ...unit, basicAttackSkillId: spec.basicAttackSkillId };
  }
  return unit;
};

export const buildBattle = (
  seed: number,
  specs: readonly UnitSpec[],
): BattleState => {
  const units: Record<InstanceId, Unit> = {};
  specs.forEach((spec, idx) => {
    const unit = buildUnit({ ...spec, insertionIndex: spec.insertionIndex ?? idx });
    units[unit.id] = unit;
  });
  const turnOrder = sortedTurnOrder(units);
  return {
    seed,
    rngCursor: 0,
    tick: 0,
    elapsedSec: 0,
    units,
    turnOrder,
    log: [],
    result: 'ongoing',
  };
};
