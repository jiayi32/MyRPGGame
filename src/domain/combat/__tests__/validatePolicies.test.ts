import type { Skill } from '../../../content/types';
import { buildBattleState } from '../factory';
import { makeBaseStats } from '../stats';
import { toInstanceId, type Unit } from '../types';
import { canCast, resolveTargets } from '../validate';

const makeUnit = (id: string, team: Unit['team'], hpMax: number): Unit => ({
  id: toInstanceId(id),
  team,
  classId: 'drakehorn_forge.ember_initiate',
  displayName: id,
  hp: hpMax,
  hpMax,
  mp: 100,
  mpMax: 100,
  ct: 0,
  baseStats: makeBaseStats({
    strength: 30,
    intellect: 30,
    agility: 20,
    stamina: 40,
    defense: 10,
    magicDefense: 10,
    speed: 60,
  }),
  skillIds: ['skill.hp_cost', 'skill.global'],
  basicAttackSkillId: 'skill.basic',
  cooldowns: {},
  statuses: [],
  insertionIndex: 0,
  isDead: false,
});

describe('combat validation policies', () => {
  it('uses percent of max HP for HP skill costs', () => {
    const caster = makeUnit('caster', 'player', 200);
    const enemy = makeUnit('enemy', 'enemy', 200);
    const state = buildBattleState({ seed: 1, units: [caster, enemy] });

    const hpCostSkill: Skill = {
      id: 'skill.hp_cost',
      name: 'HP Cost Skill',
      description: 'Consumes percent max HP',
      ctCost: 20,
      cooldownSec: 0,
      resource: { type: 'HP', cost: 0.1 },
      target: 'single',
      tags: ['self-sacrifice'],
      effects: [],
    };

    const result = canCast(state, caster, hpCostSkill, [enemy.id]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.hpCost).toBe(20);
    }
  });

  it('resolves global offensive targets to enemies only', () => {
    const caster = makeUnit('caster', 'player', 200);
    const ally = makeUnit('ally', 'player', 200);
    const enemy = makeUnit('enemy', 'enemy', 200);
    const state = buildBattleState({ seed: 1, units: [caster, ally, enemy] });

    const globalSkill: Skill = {
      id: 'skill.global',
      name: 'Global Skill',
      description: 'Offensive global hit',
      ctCost: 20,
      cooldownSec: 0,
      resource: { type: 'none', cost: 0 },
      target: 'global',
      tags: ['aoe'],
      effects: [],
    };

    const targets = resolveTargets(state, caster, globalSkill, []);
    expect(targets).toContain(enemy.id);
    expect(targets).not.toContain(caster.id);
    expect(targets).not.toContain(ally.id);
  });
});
