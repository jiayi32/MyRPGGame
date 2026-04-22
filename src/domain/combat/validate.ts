import {
  isSpecified,
  type Skill,
  type SkillTarget,
} from '../../content/types';
import { SYNTHETIC_BASIC_ATTACK_ID } from './factory';
import type { BattleState, InstanceId, StepError, Unit } from './types';

const EPSILON = 1e-9;

export interface ValidationFailure {
  readonly ok: false;
  readonly reason: StepError;
}

export interface ValidationSuccess {
  readonly ok: true;
  readonly mpCost: number;
  readonly hpCost: number;
  readonly ctCost: number;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

const fail = (reason: StepError): ValidationFailure => ({ ok: false, reason });

const unitOwnsSkill = (unit: Unit, skillId: Skill['id']): boolean => {
  if (skillId === SYNTHETIC_BASIC_ATTACK_ID) return true;
  if (unit.basicAttackSkillId === skillId) return true;
  return unit.skillIds.includes(skillId);
};

const isSelfTarget = (target: SkillTarget): boolean => target === 'self';

const isAllyTarget = (target: SkillTarget): boolean =>
  target === 'ally' || target === 'allies';

const isMultiTarget = (target: SkillTarget): boolean =>
  target === 'area' ||
  target === 'global' ||
  target === 'cone' ||
  target === 'allies';

const isEnemyTarget = (target: SkillTarget): boolean =>
  target === 'single' ||
  target === 'area' ||
  target === 'global' ||
  target === 'cone';

const resolveHpCost = (caster: Unit, skill: Skill): number => {
  if (skill.resource.type !== 'HP' || !isSpecified(skill.resource.cost)) {
    return 0;
  }
  // Locked policy: HP resource costs are authored as a percentage of max HP.
  return caster.hpMax * skill.resource.cost;
};

const validateTargets = (
  state: BattleState,
  caster: Unit,
  skill: Skill,
  targetIds: readonly InstanceId[],
): ValidationFailure | null => {
  const target = skill.target;

  if (isSelfTarget(target)) {
    if (targetIds.length === 0) return null;
    if (targetIds.length === 1 && targetIds[0] === caster.id) return null;
    return fail('invalid_target');
  }

  if (target === 'global') {
    return null;
  }

  if (targetIds.length === 0) return fail('invalid_target');
  if (!isMultiTarget(target) && targetIds.length > 1) {
    return fail('invalid_target');
  }

  for (const id of targetIds) {
    const t = state.units[id];
    if (t === undefined || t.isDead) return fail('invalid_target');
    if (isAllyTarget(target) && t.team !== caster.team) {
      return fail('invalid_target');
    }
    if (!isAllyTarget(target) && isEnemyTarget(target) && t.team === caster.team) {
      return fail('invalid_target');
    }
  }

  return null;
};

export const canCast = (
  state: BattleState,
  caster: Unit,
  skill: Skill,
  targetIds: readonly InstanceId[],
): ValidationResult => {
  if (state.result !== 'ongoing') return fail('battle_ended');
  if (caster.isDead) return fail('unit_dead');
  if (caster.ct > EPSILON) return fail('not_ready');
  if (caster.statuses.some((s) => s.kind === 'stun')) return fail('unit_stunned');
  if (!unitOwnsSkill(caster, skill.id)) return fail('skill_not_owned');

  const cooldown = caster.cooldowns[skill.id] ?? 0;
  if (cooldown > EPSILON) return fail('skill_on_cooldown');

  const mpCost =
    skill.resource.type === 'MP' && isSpecified(skill.resource.cost)
      ? skill.resource.cost
      : 0;
  const hpCost = resolveHpCost(caster, skill);
  if (mpCost > 0 && caster.mp < mpCost) return fail('insufficient_resource');
  if (hpCost > 0 && caster.hp <= hpCost) return fail('insufficient_resource');

  const targetFailure = validateTargets(state, caster, skill, targetIds);
  if (targetFailure !== null) return targetFailure;

  const ctCost = isSpecified(skill.ctCost) ? skill.ctCost : 0;

  return { ok: true, mpCost, hpCost, ctCost };
};

export const resolveTargets = (
  state: BattleState,
  caster: Unit,
  skill: Skill,
  requestedTargetIds: readonly InstanceId[],
): readonly InstanceId[] => {
  const target = skill.target;
  if (isSelfTarget(target)) return [caster.id];
  if (target === 'global') {
    return Object.values(state.units)
      .filter((u) => !u.isDead && u.team !== caster.team)
      .map((u) => u.id);
  }
  if (target === 'area' || target === 'cone') {
    return Object.values(state.units)
      .filter((u) => !u.isDead && u.team !== caster.team)
      .map((u) => u.id);
  }
  if (target === 'allies') {
    return Object.values(state.units)
      .filter((u) => !u.isDead && u.team === caster.team)
      .map((u) => u.id);
  }
  return requestedTargetIds;
};
