import type { Skill, SkillId } from '../../../content/types';
import { createEngine } from '../index';
import { toInstanceId } from '../types';
import { buildUnit } from './fixtures';

const attack: Skill = {
  id: 'test.attack' as SkillId,
  name: 'Attack',
  description: '',
  ctCost: 40,
  cooldownSec: 0,
  resource: { type: 'none', cost: 0 },
  target: 'single',
  tags: [],
  effects: [
    {
      kind: 'damage',
      description: '',
      magnitude: 1.0,
      magnitudeUnit: 'multiplier',
      damageType: 'physical',
    },
  ],
};

const ember: Skill = {
  id: 'test.ember' as SkillId,
  name: 'Ember',
  description: '',
  ctCost: 2,
  cooldownSec: 10,
  resource: { type: 'MP', cost: 10 },
  target: 'single',
  tags: [],
  effects: [
    {
      kind: 'dot',
      description: '',
      magnitude: 0.05,
      magnitudeUnit: 'max_hp_percent',
      damageType: 'fire',
      durationSec: 4,
    },
  ],
};

const lookup = (id: SkillId): Skill | undefined => {
  if (id === attack.id) return attack;
  if (id === ember.id) return ember;
  return undefined;
};

describe('combat integration', () => {
  test('full cycle: advance → ready → cast → advance → enemy dies', () => {
    const p = buildUnit({
      id: 'p',
      team: 'player',
      stats: { strength: 200, speed: 80 },
      skillIds: ['test.attack'],
      basicAttackSkillId: 'test.attack',
      ct: 0,
    });
    const e = buildUnit({
      id: 'e',
      team: 'enemy',
      hp: 30,
      stats: { speed: 60 },
      basicAttackSkillId: 'test.attack',
      ct: 10,
    });
    let engine = createEngine({ seed: 99, units: [p, e], skillLookup: lookup });

    const ready = engine.ready();
    expect(ready?.id).toBe(toInstanceId('p'));

    let guard = 0;
    while (engine.state.result === 'ongoing' && guard < 50) {
      guard += 1;
      const r = engine.ready();
      if (r === null) {
        engine = engine.advance();
        continue;
      }
      const targetTeam = r.team === 'player' ? 'enemy' : 'player';
      const target = Object.values(engine.state.units).find(
        (u) => u.team === targetTeam && !u.isDead,
      );
      if (target === undefined) break;
      const { engine: next } = engine.step({
        kind: 'basic_attack',
        unitId: r.id,
        targetId: target.id,
      });
      engine = next;
    }
    expect(engine.state.result).toBe('won');
  });

  test('skill on cooldown rejected after first cast', () => {
    const p = buildUnit({
      id: 'p',
      team: 'player',
      stats: { intellect: 50, speed: 80 },
      skillIds: ['test.ember'],
      mp: 100,
    });
    const e = buildUnit({ id: 'e', team: 'enemy', hp: 500, ct: 1000 });
    let engine = createEngine({ seed: 1, units: [p, e], skillLookup: lookup });

    const first = engine.step({
      kind: 'cast_skill',
      unitId: toInstanceId('p'),
      skillId: ember.id,
      targetIds: [toInstanceId('e')],
    });
    expect(first.result.ok).toBe(true);
    engine = first.engine;

    engine = engine.advance();
    const ready = engine.ready();
    expect(ready?.id).toBe(toInstanceId('p'));

    const second = engine.step({
      kind: 'cast_skill',
      unitId: toInstanceId('p'),
      skillId: ember.id,
      targetIds: [toInstanceId('e')],
    });
    expect(second.result.ok).toBe(false);
    if (!second.result.ok) expect(second.result.reason).toBe('skill_on_cooldown');
  });

  test('mp is deducted on cast', () => {
    const p = buildUnit({
      id: 'p',
      team: 'player',
      stats: { intellect: 50 },
      skillIds: ['test.ember'],
      mp: 100,
    });
    const e = buildUnit({ id: 'e', team: 'enemy' });
    let engine = createEngine({ seed: 1, units: [p, e], skillLookup: lookup });
    const { engine: next } = engine.step({
      kind: 'cast_skill',
      unitId: toInstanceId('p'),
      skillId: ember.id,
      targetIds: [toInstanceId('e')],
    });
    expect(next.state.units[toInstanceId('p')]!.mp).toBe(90);
  });

  test('step on dead unit fails', () => {
    const p = buildUnit({ id: 'p', team: 'player', hp: 0 });
    const dead = { ...p, hp: 0, isDead: true };
    const e = buildUnit({ id: 'e', team: 'enemy' });
    const engine = createEngine({ seed: 1, units: [dead, e], skillLookup: lookup });
    const { result } = engine.step({
      kind: 'basic_attack',
      unitId: toInstanceId('p'),
      targetId: toInstanceId('e'),
    });
    expect(result.ok).toBe(false);
  });

  test('dot status persists and ticks damage via advance', () => {
    const p = buildUnit({
      id: 'p',
      team: 'player',
      stats: { intellect: 50, speed: 80 },
      skillIds: ['test.ember'],
      mp: 100,
    });
    const e = buildUnit({ id: 'e', team: 'enemy', hp: 1000, ct: 1000 });
    let engine = createEngine({ seed: 5, units: [p, e], skillLookup: lookup });
    const { engine: afterCast } = engine.step({
      kind: 'cast_skill',
      unitId: toInstanceId('p'),
      skillId: ember.id,
      targetIds: [toInstanceId('e')],
    });
    engine = afterCast;
    expect(engine.state.units[toInstanceId('e')]!.statuses.length).toBeGreaterThan(0);

    const hpBeforeTicks = engine.state.units[toInstanceId('e')]!.hp;
    engine = engine.advance();
    const hpAfter = engine.state.units[toInstanceId('e')]!.hp;
    expect(hpAfter).toBeLessThan(hpBeforeTicks);
  });
});
