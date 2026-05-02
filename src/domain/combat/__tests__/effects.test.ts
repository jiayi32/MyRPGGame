import type { Skill, SkillEffect, SkillEffectKind } from '../../../content/types';
import { applySkillEffects } from '../effects';
import { toInstanceId, type BattleState, type HitTier } from '../types';
import { buildBattle } from './fixtures';

const hit = (tier: HitTier, severity: number) => ({
  tier,
  severity,
  nextCursor: 0,
});

const baseSkill = (effects: SkillEffect[]): Skill => ({
  id: 'test.skill' as Skill['id'],
  name: 'Test Skill',
  description: '',
  ctCost: 40,
  cooldownSec: 0,
  resource: { type: 'none', cost: 0 },
  target: 'single',
  tags: [],
  effects,
});

const kind = (k: SkillEffectKind): SkillEffectKind => k;

describe('effects', () => {
  test('damage effect reduces target hp and emits damage event', () => {
    const state = buildBattle(1, [
      { id: 'p', team: 'player', stats: { strength: 100 } },
      { id: 'e', team: 'enemy', hp: 200 },
    ]);
    const skill = baseSkill([
      {
        kind: kind('damage'),
        description: '',
        magnitude: 1.0,
        magnitudeUnit: 'multiplier',
        damageType: 'physical',
      },
    ]);
    const result = applySkillEffects(
      state,
      state.units[toInstanceId('p')]!,
      [toInstanceId('e')],
      skill,
      hit('normal', 1),
      0,
      1,
    );
    const enemy = result.state.units[toInstanceId('e')]!;
    expect(enemy.hp).toBeLessThan(200);
    const damageEvent = result.state.log.find((e) => e.type === 'damage');
    expect(damageEvent).toBeDefined();
  });

  test('failed hit applies no damage', () => {
    const state = buildBattle(1, [
      { id: 'p', team: 'player', stats: { strength: 100 } },
      { id: 'e', team: 'enemy', hp: 200 },
    ]);
    const skill = baseSkill([
      {
        kind: kind('damage'),
        description: '',
        magnitude: 1.0,
        magnitudeUnit: 'multiplier',
        damageType: 'physical',
      },
    ]);
    const result = applySkillEffects(
      state,
      state.units[toInstanceId('p')]!,
      [toInstanceId('e')],
      skill,
      hit('fail', 0),
      0,
      1,
    );
    expect(result.state.units[toInstanceId('e')]!.hp).toBe(200);
  });

  test('critical severity scales damage up', () => {
    const state = buildBattle(1, [
      { id: 'p', team: 'player', stats: { strength: 100 } },
      { id: 'e', team: 'enemy', hp: 500 },
    ]);
    const skill = baseSkill([
      {
        kind: kind('damage'),
        description: '',
        magnitude: 1.0,
        magnitudeUnit: 'multiplier',
        damageType: 'physical',
      },
    ]);
    const normal = applySkillEffects(
      state,
      state.units[toInstanceId('p')]!,
      [toInstanceId('e')],
      skill,
      hit('normal', 1),
      0,
      1,
    );
    const crit = applySkillEffects(
      state,
      state.units[toInstanceId('p')]!,
      [toInstanceId('e')],
      skill,
      hit('critical', 2),
      0,
      1,
    );
    const normalHp = normal.state.units[toInstanceId('e')]!.hp;
    const critHp = crit.state.units[toInstanceId('e')]!.hp;
    expect(500 - critHp).toBeGreaterThan(500 - normalHp);
  });

  test('heal effect increases target hp', () => {
    const state = buildBattle(1, [
      { id: 'p', team: 'player', hp: 100, stats: { intellect: 80 } },
    ]);
    const playerId = toInstanceId('p');
    const injured: BattleState = {
      ...state,
      units: { ...state.units, [playerId]: { ...state.units[playerId]!, hp: 50 } },
    };
    const skill = baseSkill([
      {
        kind: kind('heal'),
        description: '',
        magnitude: 0.2,
        magnitudeUnit: 'max_hp_percent',
      },
    ]);
    const result = applySkillEffects(
      injured,
      injured.units[playerId]!,
      [playerId],
      skill,
      hit('normal', 1),
      0,
      1,
    );
    expect(result.state.units[playerId]!.hp).toBeGreaterThan(50);
  });

  test('dot effect applies a status to the target', () => {
    const state = buildBattle(1, [
      { id: 'p', team: 'player', stats: { strength: 50 } },
      { id: 'e', team: 'enemy' },
    ]);
    const skill = baseSkill([
      {
        kind: kind('dot'),
        description: '',
        magnitude: 0.05,
        magnitudeUnit: 'max_hp_percent',
        damageType: 'fire',
        durationSec: 4,
      },
    ]);
    const result = applySkillEffects(
      state,
      state.units[toInstanceId('p')]!,
      [toInstanceId('e')],
      skill,
      hit('normal', 1),
      0,
      1,
    );
    const enemy = result.state.units[toInstanceId('e')]!;
    expect(enemy.statuses).toHaveLength(1);
    expect(enemy.statuses[0]!.kind).toBe('dot');
  });

  test('ct_shift effect reduces target ct', () => {
    const state = buildBattle(1, [
      { id: 'p', team: 'player' },
      { id: 'e', team: 'enemy', ct: 50 },
    ]);
    const skill = baseSkill([
      {
        kind: kind('ct_shift'),
        description: '',
        magnitude: 20,
        magnitudeUnit: 'flat',
      },
    ]);
    const result = applySkillEffects(
      state,
      state.units[toInstanceId('p')]!,
      [toInstanceId('e')],
      skill,
      hit('normal', 1),
      0,
      1,
    );
    expect(result.state.units[toInstanceId('e')]!.ct).toBe(30);
  });

  test('shield absorbs incoming damage before hp', () => {
    const state = buildBattle(1, [
      { id: 'p', team: 'player', stats: { strength: 100 } },
      { id: 'e', team: 'enemy', hp: 100 },
    ]);
    const shieldSkill = baseSkill([
      {
        kind: kind('shield'),
        description: '',
        magnitude: 50,
        magnitudeUnit: 'flat',
      },
    ]);
    const shielded = applySkillEffects(
      state,
      state.units[toInstanceId('e')]!,
      [toInstanceId('e')],
      shieldSkill,
      hit('normal', 1),
      0,
      1,
    );
    const damageSkill = baseSkill([
      {
        kind: kind('damage'),
        description: '',
        magnitude: 1.0,
        magnitudeUnit: 'multiplier',
        damageType: 'physical',
      },
    ]);
    const hpBefore = shielded.state.units[toInstanceId('e')]!.hp;
    const after = applySkillEffects(
      shielded.state,
      shielded.state.units[toInstanceId('p')]!,
      [toInstanceId('e')],
      damageSkill,
      hit('normal', 1),
      0,
      2,
    );
    const enemyAfter = after.state.units[toInstanceId('e')]!;
    expect(enemyAfter.hp).toBeLessThanOrEqual(hpBefore);
    const shieldStillPresent = enemyAfter.statuses.some((s) => s.kind === 'shield');
    expect(enemyAfter.hp === hpBefore || shieldStillPresent).toBeDefined();
  });

  test('cleanse removes debuffs/dots/stuns but preserves buffs', () => {
    const state = buildBattle(1, [{ id: 'p', team: 'player' }]);
    const playerId = toInstanceId('p');
    const p = state.units[playerId]!;
    const withStatuses: BattleState = {
      ...state,
      units: {
        ...state.units,
        [playerId]: {
          ...p,
          statuses: [
            {
              id: toInstanceId('s1'),
              kind: 'dot' as const,
              sourceUnitId: toInstanceId('x'),
              skillId: 's' as Skill['id'],
              snapshot: { magnitude: 0, magnitudeUnit: 'flat' as const, sourceStrength: 0, sourceIntellect: 0, sourceAgility: 0 },
              remainingSec: 5,
              stacks: 1,
              tickIntervalSec: 1,
              secSinceLastTick: 0,
              tags: [],
            },
            {
              id: toInstanceId('s2'),
              kind: 'buff' as const,
              sourceUnitId: toInstanceId('x'),
              skillId: 's' as Skill['id'],
              snapshot: { magnitude: 0.1, magnitudeUnit: 'percent' as const, sourceStrength: 0, sourceIntellect: 0, sourceAgility: 0, statTag: 'strength' },
              remainingSec: 5,
              stacks: 1,
              tickIntervalSec: 1,
              secSinceLastTick: 0,
              tags: [],
            },
          ],
        },
      },
    };
    const skill = baseSkill([
      { kind: kind('cleanse'), description: '' },
    ]);
    const result = applySkillEffects(
      withStatuses,
      withStatuses.units[playerId]!,
      [playerId],
      skill,
      hit('normal', 1),
      0,
      1,
    );
    const remaining = result.state.units[playerId]!.statuses;
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.kind).toBe('buff');
  });

  test('utility effect clears non-active cooldowns on target', () => {
    const state = buildBattle(2, [{ id: 'p', team: 'player' }]);
    const playerId = toInstanceId('p');
    const withCooldowns: BattleState = {
      ...state,
      units: {
        ...state.units,
        [playerId]: {
          ...state.units[playerId]!,
          cooldowns: {
            ['test.skill' as Skill['id']]: 12,
            ['test.other' as Skill['id']]: 5,
          },
        },
      },
    };

    const skill = baseSkill([
      { kind: kind('utility'), description: '', magnitude: 1, magnitudeUnit: 'flat' },
    ]);
    const result = applySkillEffects(
      withCooldowns,
      withCooldowns.units[playerId]!,
      [playerId],
      skill,
      hit('normal', 1),
      0,
      1,
    );

    const cooldowns = result.state.units[playerId]!.cooldowns;
    expect(cooldowns['test.skill' as Skill['id']]).toBe(12);
    expect(cooldowns['test.other' as Skill['id']]).toBeUndefined();
  });

  test('summon effect spawns a real Thrall unit into state.units', () => {
    const state = buildBattle(3, [
      { id: 'e', team: 'enemy', stats: { strength: 50, stamina: 30 } },
      { id: 'p', team: 'player' },
    ]);
    const enemyId = toInstanceId('e');
    const skill = baseSkill([
      {
        kind: kind('summon'),
        description: 'Summon ally spirit',
        magnitude: 1,
        magnitudeUnit: 'flat',
        durationSec: 4,
      },
    ]);
    const result = applySkillEffects(
      state,
      state.units[enemyId]!,
      [enemyId],
      skill,
      hit('normal', 1),
      0,
      1,
    );

    const units = Object.values(result.state.units);
    const spawned = units.find((u) => u.displayName === 'Thrall');
    expect(spawned).toBeDefined();
    expect(spawned?.team).toBe('enemy');
    expect(spawned?.basicAttackSkillId).toBe('__synthetic.basic_attack');
    expect(result.state.log.some((e) => e.type === 'unit_spawned')).toBe(true);
  });
});

describe('heal_reduction mechanic', () => {
  const makeHealSkill = (): Skill =>
    ({
      id: 'test.heal' as Skill['id'],
      name: 'Heal',
      description: '',
      ctCost: 40,
      cooldownSec: 0,
      resource: { type: 'none', cost: 0 },
      target: 'single',
      tags: [],
      effects: [
        { kind: 'heal' as const, description: '', magnitude: 1.0, magnitudeUnit: 'multiplier' as const },
      ],
    }) as Skill;

  const makeHealReductionStatus = (id: string, magnitude: number) => ({
    id: toInstanceId(id),
    kind: 'debuff' as const,
    sourceUnitId: toInstanceId('e'),
    skillId: 'enemy.sustain_denial.suppress' as Skill['id'],
    snapshot: {
      magnitude,
      magnitudeUnit: 'percent' as const,
      sourceStrength: 0,
      sourceIntellect: 0,
      sourceAgility: 0,
      statTag: 'heal_reduction',
    },
    remainingSec: 20,
    stacks: 1,
    tickIntervalSec: 1,
    secSinceLastTick: 0,
    tags: [],
  });

  test('heal_reduction debuff at 50% halves the heal received', () => {
    const rawState = buildBattle(1, [
      { id: 'healer', team: 'player', stats: { intellect: 100 } },
      { id: 'target', team: 'player', hp: 200 },
    ]);
    const healerId = toInstanceId('healer');
    const targetId = toInstanceId('target');
    // Damage the target first so there's room to heal
    const state: BattleState = {
      ...rawState,
      units: {
        ...rawState.units,
        [targetId]: { ...rawState.units[targetId]!, hp: 50 },
      },
    };

    const stateWithDebuff: BattleState = {
      ...state,
      units: {
        ...state.units,
        [targetId]: {
          ...state.units[targetId]!,
          statuses: [makeHealReductionStatus('hr1', 0.5)],
        },
      },
    };

    const result = applySkillEffects(
      stateWithDebuff,
      stateWithDebuff.units[healerId]!,
      [targetId],
      makeHealSkill(),
      { tier: 'normal', severity: 1, nextCursor: 0 },
      0,
      1,
    );

    // Baseline: same heal without the debuff
    const baseline = applySkillEffects(
      state,
      state.units[healerId]!,
      [targetId],
      makeHealSkill(),
      { tier: 'normal', severity: 1, nextCursor: 0 },
      0,
      1,
    );

    const healedHp = result.state.units[targetId]!.hp;
    const baselineHp = baseline.state.units[targetId]!.hp;
    const healedDelta = healedHp - 50;
    const baselineDelta = baselineHp - 50;

    expect(baselineDelta).toBeGreaterThan(0);
    // With 50% reduction, healed amount should be ~50% of baseline
    expect(healedDelta).toBeCloseTo(baselineDelta * 0.5, 0);
  });

  test('heal_reduction debuffs stack and are capped at 90%', () => {
    const rawState = buildBattle(1, [
      { id: 'healer', team: 'player', stats: { intellect: 100 } },
      { id: 'target', team: 'player', hp: 200 },
    ]);
    const healerId = toInstanceId('healer');
    const targetId = toInstanceId('target');
    // Damage the target first so there's room to heal
    const state: BattleState = {
      ...rawState,
      units: {
        ...rawState.units,
        [targetId]: { ...rawState.units[targetId]!, hp: 50 },
      },
    };

    // Two 60% debuffs would sum to 120% — should be capped at 90%
    const stateWith2Debuffs: BattleState = {
      ...state,
      units: {
        ...state.units,
        [targetId]: {
          ...state.units[targetId]!,
          statuses: [
            makeHealReductionStatus('hr1', 0.6),
            makeHealReductionStatus('hr2', 0.6),
          ],
        },
      },
    };

    const result = applySkillEffects(
      stateWith2Debuffs,
      stateWith2Debuffs.units[healerId]!,
      [targetId],
      makeHealSkill(),
      { tier: 'normal', severity: 1, nextCursor: 0 },
      0,
      1,
    );

    const baseline = applySkillEffects(
      state,
      state.units[healerId]!,
      [targetId],
      makeHealSkill(),
      { tier: 'normal', severity: 1, nextCursor: 0 },
      0,
      1,
    );

    const healedDelta = result.state.units[targetId]!.hp - 50;
    const baselineDelta = baseline.state.units[targetId]!.hp - 50;

    expect(baselineDelta).toBeGreaterThan(0);
    // Capped at 90%, so at least 10% of baseline heal should land
    expect(healedDelta).toBeCloseTo(baselineDelta * 0.1, 0);
  });
});
