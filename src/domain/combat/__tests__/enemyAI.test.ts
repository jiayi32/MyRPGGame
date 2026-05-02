import type { Skill, SkillId } from '../../../content/types';
import { decideEnemyAction } from '../bossAI';
import { toInstanceId } from '../types';
import { buildBattle, buildUnit } from './fixtures';

const rewindSkillId = 'enemy.ct_manipulator.rewind' as SkillId;
const strikeSkillId = 'enemy.ct_manipulator.strike' as SkillId;

const rewindSkill: Skill = {
  id: rewindSkillId,
  name: 'Temporal Rewind',
  description: '',
  ctCost: 30,
  cooldownSec: 15,
  resource: { type: 'none', cost: 0 },
  target: 'single',
  tags: [],
  effects: [{ kind: 'ct_shift', description: '', magnitude: 20 }],
};

const strikeSkill: Skill = {
  id: strikeSkillId,
  name: 'Temporal Strike',
  description: '',
  ctCost: 40,
  cooldownSec: 0,
  resource: { type: 'none', cost: 0 },
  target: 'single',
  tags: [],
  neverMiss: true,
  effects: [{ kind: 'damage', description: '', magnitude: 0.9, magnitudeUnit: 'multiplier', damageType: 'physical' }],
};

const lookup = (id: SkillId): Skill | undefined => {
  if (id === rewindSkillId) return rewindSkill;
  if (id === strikeSkillId) return strikeSkill;
  return undefined;
};

describe('decideEnemyAction', () => {
  it('casts signature skill when off cooldown', () => {
    const enemy = buildUnit({
      id: 'e',
      team: 'enemy',
      skillIds: [rewindSkillId],
      basicAttackSkillId: strikeSkillId,
      insertionIndex: 0,
    });
    const player = buildUnit({ id: 'p', team: 'player', insertionIndex: 1 });
    const state = buildBattle(1, [enemy, player]);

    const action = decideEnemyAction({ state, unitId: enemy.id, skillLookup: lookup });

    expect(action.kind).toBe('cast_skill');
    if (action.kind === 'cast_skill') {
      expect(action.skillId).toBe(rewindSkillId);
    }
  });

  it('falls back to basic attack when all signature skills are on cooldown', () => {
    const enemy = buildUnit({
      id: 'e',
      team: 'enemy',
      skillIds: [rewindSkillId],
      basicAttackSkillId: strikeSkillId,
      insertionIndex: 0,
    });
    const player = buildUnit({ id: 'p', team: 'player', insertionIndex: 1 });
    const state = buildBattle(1, [enemy, player]);

    // Put the rewind skill on cooldown
    const enemyUnit = state.units[enemy.id]!;
    const stateWithCooldown = {
      ...state,
      units: {
        ...state.units,
        [enemy.id]: { ...enemyUnit, cooldowns: { [rewindSkillId]: 14 } },
      },
    };

    const action = decideEnemyAction({ state: stateWithCooldown, unitId: enemy.id, skillLookup: lookup });

    // When the signature skill is on cooldown, falls back to the basic attack skill (also returned as cast_skill)
    expect(action.kind).toBe('cast_skill');
    if (action.kind === 'cast_skill') {
      expect(action.skillId).toBe(strikeSkillId);
    }
  });

  it('ct_shift rewind skill targets the player (opponent), not a teammate', () => {
    const ally = buildUnit({ id: 'ally', team: 'enemy', insertionIndex: 0 });
    const enemy = buildUnit({
      id: 'e',
      team: 'enemy',
      skillIds: [rewindSkillId],
      basicAttackSkillId: strikeSkillId,
      insertionIndex: 1,
    });
    const player = buildUnit({ id: 'p', team: 'player', insertionIndex: 2 });
    const state = buildBattle(1, [ally, enemy, player]);

    const action = decideEnemyAction({ state, unitId: enemy.id, skillLookup: lookup });

    // Should target the player (only opponent alive), not the ally
    expect(action.kind).toBe('cast_skill');
    if (action.kind === 'cast_skill') {
      expect(action.targetIds).toContain(player.id);
      expect(action.targetIds).not.toContain(ally.id);
      expect(action.targetIds).not.toContain(enemy.id);
    }
  });
});
