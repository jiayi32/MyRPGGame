import type { Skill, SkillId } from '../../content/types';
import type { Action, BattleState, InstanceId, Unit } from './types';

const normalizeSeed = (seed: number): number => Math.trunc(Math.abs(seed)) >>> 0;

const hash = (seed: number, salt: number): number => {
  let x = (normalizeSeed(seed) ^ Math.imul(salt | 0, 0x27d4eb2d)) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x85ebca6b) >>> 0;
  x ^= x >>> 13;
  return x >>> 0;
};

const aliveEnemiesOf = (state: BattleState, team: Unit['team']): readonly Unit[] =>
  Object.values(state.units).filter((u) => !u.isDead && u.team !== team);

const selectPrimaryTargetId = (state: BattleState, boss: Unit): InstanceId | undefined => {
  const targets = aliveEnemiesOf(state, boss.team);
  if (targets.length === 0) return undefined;

  // Deterministic target priority: lowest current HP, then insertion order.
  const sorted = [...targets].sort((a, b) => {
    if (a.hp !== b.hp) return a.hp - b.hp;
    return a.insertionIndex - b.insertionIndex;
  });
  return sorted[0]?.id;
};

const firstReadySkill = (
  boss: Unit,
  skillIds: readonly SkillId[],
): SkillId | undefined => {
  if (skillIds.length === 0) return boss.basicAttackSkillId;

  const offset = hash(boss.insertionIndex, boss.skillIds.length + 1) % skillIds.length;
  for (let i = 0; i < skillIds.length; i += 1) {
    const idx = (offset + i) % skillIds.length;
    const skillId = skillIds[idx];
    if (skillId === undefined) continue;
    const cooldown = boss.cooldowns[skillId] ?? 0;
    if (cooldown <= 1e-9) return skillId;
  }

  return boss.basicAttackSkillId;
};

const targetIdsForSkill = (
  state: BattleState,
  boss: Unit,
  skill: Skill,
): readonly InstanceId[] => {
  const primary = selectPrimaryTargetId(state, boss);
  if (primary === undefined) return [];

  if (skill.target === 'global') return [];
  if (skill.target === 'area' || skill.target === 'cone') {
    return aliveEnemiesOf(state, boss.team).map((u) => u.id);
  }
  if (skill.target === 'self') return [boss.id];
  if (skill.target === 'allies') {
    return Object.values(state.units)
      .filter((u) => !u.isDead && u.team === boss.team)
      .map((u) => u.id);
  }
  return [primary];
};

export interface BossAiContext {
  state: BattleState;
  bossUnitId: InstanceId;
  skillLookup: (id: SkillId) => Skill | undefined;
}

export const decideBossAction = (ctx: BossAiContext): Action => {
  const boss = ctx.state.units[ctx.bossUnitId];
  if (boss === undefined || boss.isDead) {
    return { kind: 'wait', unitId: ctx.bossUnitId };
  }

  if (aliveEnemiesOf(ctx.state, boss.team).length === 0) {
    return { kind: 'wait', unitId: boss.id };
  }

  const skillId = firstReadySkill(boss, boss.skillIds);
  if (skillId === undefined) {
    return { kind: 'wait', unitId: boss.id };
  }

  const skill = ctx.skillLookup(skillId);
  if (skill === undefined) {
    const targetId = selectPrimaryTargetId(ctx.state, boss);
    if (targetId === undefined) {
      return { kind: 'wait', unitId: boss.id };
    }
    return {
      kind: 'basic_attack',
      unitId: boss.id,
      targetId,
    };
  }

  const targetIds = targetIdsForSkill(ctx.state, boss, skill);
  if (
    targetIds.length === 0 &&
    skill.target !== 'self' &&
    skill.target !== 'global'
  ) {
    return { kind: 'wait', unitId: boss.id };
  }

  return {
    kind: 'cast_skill',
    unitId: boss.id,
    skillId: skill.id,
    targetIds,
  };
};
