import type { Skill, SkillId } from '../../../content/types';
import { decideBossAction } from '../bossAI';
import { toInstanceId } from '../types';
import { buildBattle, buildUnit } from './fixtures';

const slash: Skill = {
  id: 'test.slash' as SkillId,
  name: 'Slash',
  description: '',
  ctCost: 20,
  cooldownSec: 0,
  resource: { type: 'none', cost: 0 },
  target: 'single',
  tags: [],
  effects: [],
};

const quake: Skill = {
  id: 'test.quake' as SkillId,
  name: 'Quake',
  description: '',
  ctCost: 30,
  cooldownSec: 0,
  resource: { type: 'none', cost: 0 },
  target: 'area',
  tags: [],
  effects: [],
};

const lookup = (id: SkillId): Skill | undefined => {
  if (id === slash.id) return slash;
  if (id === quake.id) return quake;
  return undefined;
};

describe('boss AI', () => {
  it('is deterministic for identical battle state and lookup', () => {
    const boss = buildUnit({
      id: 'b',
      team: 'enemy',
      skillIds: [slash.id, quake.id],
      basicAttackSkillId: slash.id,
      ct: 0,
      hp: 250,
    });
    const player = buildUnit({ id: 'p', team: 'player', hp: 180 });
    const state = buildBattle(15, [boss, player]);

    const a = decideBossAction({
      state,
      bossUnitId: boss.id,
      skillLookup: lookup,
    });
    const b = decideBossAction({
      state,
      bossUnitId: boss.id,
      skillLookup: lookup,
    });

    expect(a).toEqual(b);
  });

  it('falls back to basic attack when chosen skill is missing from lookup', () => {
    const boss = buildUnit({
      id: 'b',
      team: 'enemy',
      skillIds: ['test.missing' as SkillId],
      basicAttackSkillId: slash.id,
      ct: 0,
    });
    const player = buildUnit({ id: 'p', team: 'player' });
    const state = buildBattle(22, [boss, player]);

    const action = decideBossAction({
      state,
      bossUnitId: boss.id,
      skillLookup: lookup,
    });

    expect(action.kind).toBe('basic_attack');
  });

  it('returns wait when no enemy targets are alive', () => {
    const boss = buildUnit({
      id: 'b',
      team: 'enemy',
      skillIds: [slash.id],
      basicAttackSkillId: slash.id,
      ct: 0,
    });
    const state = buildBattle(33, [boss, { id: 'p', team: 'player', hp: 1 }]);
    const playerId = toInstanceId('p');
    const player = state.units[playerId]!;
    const noEnemyAliveState = {
      ...state,
      units: {
        ...state.units,
        [playerId]: {
          ...player,
          hp: 0,
          isDead: true,
        },
      },
    };

    const action = decideBossAction({
      state: noEnemyAliveState,
      bossUnitId: boss.id,
      skillLookup: lookup,
    });

    expect(action.kind).toBe('wait');
  });
});
