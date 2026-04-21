import { CT_REDUCTION_CAP, effectiveStats, makeBaseStats } from '../stats';
import { toInstanceId, type StatusInstance, type Unit } from '../types';

const makeUnit = (stats: Partial<Parameters<typeof makeBaseStats>[0]>, statuses: readonly StatusInstance[] = []): Unit => ({
  id: toInstanceId('u1'),
  team: 'player',
  displayName: 'Test',
  hp: 100,
  hpMax: 100,
  mp: 10,
  mpMax: 10,
  ct: 0,
  baseStats: makeBaseStats(stats),
  skillIds: [],
  cooldowns: {},
  statuses,
  insertionIndex: 0,
  isDead: false,
});

describe('stats', () => {
  test('makeBaseStats applies defaults and clamps CT reduction', () => {
    const s = makeBaseStats({ strength: 10, ctReductionPct: 0.5 });
    expect(s.strength).toBe(10);
    expect(s.ctReductionPct).toBe(CT_REDUCTION_CAP);
    expect(s.speed).toBe(50);
    expect(s.critChance).toBe(0.05);
  });

  test('effectiveStats with no statuses equals base', () => {
    const unit = makeUnit({ strength: 20, defense: 10 });
    expect(effectiveStats(unit)).toEqual(unit.baseStats);
  });

  test('buff on strength adds flat magnitude', () => {
    const status: StatusInstance = {
      id: toInstanceId('s1'),
      kind: 'buff',
      sourceUnitId: toInstanceId('src'),
      skillId: 'buff_skill',
      snapshot: {
        magnitude: 5,
        magnitudeUnit: 'flat',
        sourceStrength: 0,
        sourceIntellect: 0,
        sourceAgility: 0,
        statTag: 'strength',
      },
      remainingSec: 5,
      stacks: 1,
      tickIntervalSec: 1,
      secSinceLastTick: 0,
      tags: [],
    };
    const unit = makeUnit({ strength: 20 }, [status]);
    expect(effectiveStats(unit).strength).toBe(25);
  });

  test('debuff on defense subtracts percent of baseline', () => {
    const status: StatusInstance = {
      id: toInstanceId('s1'),
      kind: 'debuff',
      sourceUnitId: toInstanceId('src'),
      skillId: 'debuff_skill',
      snapshot: {
        magnitude: 0.2,
        magnitudeUnit: 'percent',
        sourceStrength: 0,
        sourceIntellect: 0,
        sourceAgility: 0,
        statTag: 'defense',
      },
      remainingSec: 5,
      stacks: 1,
      tickIntervalSec: 1,
      secSinceLastTick: 0,
      tags: [],
    };
    const unit = makeUnit({ defense: 50 }, [status]);
    expect(effectiveStats(unit).defense).toBe(40);
  });

  test('stacks scale the delta', () => {
    const status: StatusInstance = {
      id: toInstanceId('s1'),
      kind: 'buff',
      sourceUnitId: toInstanceId('src'),
      skillId: 'skill',
      snapshot: {
        magnitude: 2,
        magnitudeUnit: 'flat',
        sourceStrength: 0,
        sourceIntellect: 0,
        sourceAgility: 0,
        statTag: 'speed',
      },
      remainingSec: 5,
      stacks: 3,
      tickIntervalSec: 1,
      secSinceLastTick: 0,
      tags: [],
    };
    const unit = makeUnit({ speed: 50 }, [status]);
    expect(effectiveStats(unit).speed).toBe(56);
  });

  test('effective ctReductionPct clamped at cap after buffs', () => {
    const status: StatusInstance = {
      id: toInstanceId('s1'),
      kind: 'buff',
      sourceUnitId: toInstanceId('src'),
      skillId: 'skill',
      snapshot: {
        magnitude: 0.5,
        magnitudeUnit: 'flat',
        sourceStrength: 0,
        sourceIntellect: 0,
        sourceAgility: 0,
        statTag: 'ct_reduction',
      },
      remainingSec: 5,
      stacks: 1,
      tickIntervalSec: 1,
      secSinceLastTick: 0,
      tags: [],
    };
    const unit = makeUnit({ ctReductionPct: 0.05 }, [status]);
    expect(effectiveStats(unit).ctReductionPct).toBe(CT_REDUCTION_CAP);
  });
});
