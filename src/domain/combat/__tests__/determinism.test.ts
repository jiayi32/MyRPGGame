import type { Skill, SkillId } from '../../../content/types';
import { createEngine } from '../index';
import { buildUnit } from './fixtures';

const attackSkill: Skill = {
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

const lookup = (id: SkillId): Skill | undefined =>
  id === attackSkill.id ? attackSkill : undefined;

const runScenario = (seed: number): ReturnType<typeof createEngine>['state'] => {
  const player = buildUnit({
    id: 'p',
    team: 'player',
    stats: { strength: 80, speed: 70 },
    skillIds: ['test.attack'],
    basicAttackSkillId: 'test.attack',
  });
  const enemy = buildUnit({
    id: 'e',
    team: 'enemy',
    hp: 60,
    stats: { speed: 60 },
    basicAttackSkillId: 'test.attack',
  });
  let engine = createEngine({ seed, units: [player, enemy], skillLookup: lookup });
  let guard = 0;
  while (engine.state.result === 'ongoing' && guard < 200) {
    guard += 1;
    const ready = engine.ready();
    if (ready === null) {
      engine = engine.advance();
      continue;
    }
    const targetTeam = ready.team === 'player' ? 'enemy' : 'player';
    const target = Object.values(engine.state.units).find(
      (u) => u.team === targetTeam && !u.isDead,
    );
    if (target === undefined) break;
    const { engine: nextEngine } = engine.step({
      kind: 'basic_attack',
      unitId: ready.id,
      targetId: target.id,
    });
    engine = nextEngine;
  }
  return engine.state;
};

describe('determinism', () => {
  test('same seed produces identical final state', () => {
    const a = runScenario(12345);
    const b = runScenario(12345);
    expect(a.result).toBe(b.result);
    expect(a.tick).toBe(b.tick);
    expect(a.rngCursor).toBe(b.rngCursor);
    expect(a.elapsedSec).toBe(b.elapsedSec);
    expect(a.log.length).toBe(b.log.length);
    for (let i = 0; i < a.log.length; i += 1) {
      expect(a.log[i]).toEqual(b.log[i]);
    }
  });

  test('different seeds diverge', () => {
    const a = runScenario(1);
    const b = runScenario(2);
    const divergent =
      a.tick !== b.tick ||
      a.log.length !== b.log.length ||
      a.log.some((ev, i) => JSON.stringify(ev) !== JSON.stringify(b.log[i]));
    expect(divergent).toBe(true);
  });

  test('same seed produces a terminal result', () => {
    const a = runScenario(777);
    expect(['won', 'lost', 'draw']).toContain(a.result);
  });
});
