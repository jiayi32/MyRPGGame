import {
  isSpecified,
  type Skill,
  type SkillId,
} from '../../content/types';
import { rollHit, type HitRoll } from './d20';
import { applySkillEffects } from './effects';
import { resolveSkillOrSynthetic, SYNTHETIC_BASIC_ATTACK_ID } from './factory';
import { sortedTurnOrder } from './queue';
import { canCast, resolveTargets } from './validate';
import type {
  Action,
  BattleEvent,
  BattleResult,
  BattleState,
  InstanceId,
  StepError,
  StepResult,
  Unit,
} from './types';

const EPSILON = 1e-9;

const fail = (state: BattleState, reason: StepError): StepResult => ({
  ok: false,
  reason,
  state,
});

const appendLog = (
  state: BattleState,
  events: readonly BattleEvent[],
): BattleState =>
  events.length === 0 ? state : { ...state, log: [...state.log, ...events] };

const patchUnit = (
  state: BattleState,
  id: InstanceId,
  patch: Partial<Unit>,
): BattleState => {
  const unit = state.units[id];
  if (unit === undefined) return state;
  return {
    ...state,
    units: { ...state.units, [id]: { ...unit, ...patch } },
  };
};

const teamAlive = (state: BattleState, team: Unit['team']): boolean =>
  Object.values(state.units).some((u) => !u.isDead && u.team === team);

const resolveResult = (state: BattleState): BattleResult => {
  const playerAlive = teamAlive(state, 'player');
  const enemyAlive = teamAlive(state, 'enemy');
  if (!playerAlive && !enemyAlive) return 'draw';
  if (!playerAlive) return 'lost';
  if (!enemyAlive) return 'won';
  return 'ongoing';
};

const sealResultIfEnded = (state: BattleState, tick: number): BattleState => {
  if (state.result !== 'ongoing') return state;
  const result = resolveResult(state);
  if (result === 'ongoing') return state;
  return {
    ...state,
    result,
    log: [...state.log, { tick, type: 'battle_ended', result }],
  };
};

const payResourceCosts = (
  state: BattleState,
  caster: Unit,
  mpCost: number,
  hpCost: number,
): BattleState => {
  if (mpCost <= 0 && hpCost <= 0) return state;
  return patchUnit(state, caster.id, {
    mp: Math.max(0, caster.mp - mpCost),
    hp: Math.max(0, caster.hp - hpCost),
  });
};

const chargeCt = (state: BattleState, caster: Unit, ctCost: number): BattleState => {
  if (ctCost <= EPSILON) return state;
  return patchUnit(state, caster.id, { ct: caster.ct + ctCost });
};

const setCooldown = (
  state: BattleState,
  caster: Unit,
  skill: Skill,
): BattleState => {
  if (!isSpecified(skill.cooldownSec) || skill.cooldownSec <= EPSILON) {
    return state;
  }
  if (skill.id === SYNTHETIC_BASIC_ATTACK_ID) return state;
  return patchUnit(state, caster.id, {
    cooldowns: { ...caster.cooldowns, [skill.id]: skill.cooldownSec },
  });
};

const resortAfterChange = (state: BattleState): BattleState => ({
  ...state,
  turnOrder: sortedTurnOrder(state.units),
});

const castSkillInternal = (
  state: BattleState,
  caster: Unit,
  skillId: SkillId,
  requestedTargetIds: readonly InstanceId[],
  skillLookup: (id: SkillId) => Skill | undefined,
): StepResult => {
  const skill = resolveSkillOrSynthetic(skillId, skillLookup);
  const validation = canCast(state, caster, skill, requestedTargetIds);
  if (!validation.ok) return fail(state, validation.reason);

  const tick = state.tick + 1;
  const hit: HitRoll = rollHit(state.seed, state.rngCursor);
  let cursor = hit.nextCursor;

  let next = payResourceCosts(state, caster, validation.mpCost, validation.hpCost);
  const casterAfterCost = next.units[caster.id] ?? caster;
  next = chargeCt(next, casterAfterCost, validation.ctCost);
  const casterAfterCt = next.units[caster.id] ?? caster;
  next = setCooldown(next, casterAfterCt, skill);

  const resolvedTargets = resolveTargets(next, casterAfterCt, skill, requestedTargetIds);

  next = appendLog(next, [
    {
      tick,
      type: 'skill_cast',
      unitId: caster.id,
      skillId: skill.id,
      targetIds: resolvedTargets,
      hitTier: hit.tier,
      severity: hit.severity,
    },
  ]);

  const effectOutcome = applySkillEffects(
    next,
    casterAfterCt,
    resolvedTargets,
    skill,
    hit,
    cursor,
    tick,
  );
  cursor = effectOutcome.cursor;
  next = effectOutcome.state;

  next = { ...next, tick, rngCursor: cursor };
  next = resortAfterChange(next);
  next = sealResultIfEnded(next, tick);

  return { ok: true, state: next };
};

const waitInternal = (state: BattleState, caster: Unit): StepResult => {
  if (state.result !== 'ongoing') return fail(state, 'battle_ended');
  if (caster.isDead) return fail(state, 'unit_dead');
  if (caster.ct > EPSILON) return fail(state, 'not_ready');
  const next = patchUnit(state, caster.id, { ct: caster.ct + 20 });
  return { ok: true, state: resortAfterChange({ ...next, tick: state.tick + 1 }) };
};

export const step = (
  state: BattleState,
  action: Action,
  skillLookup: (id: SkillId) => Skill | undefined,
): StepResult => {
  if (state.result !== 'ongoing') return fail(state, 'battle_ended');
  const caster = state.units[action.unitId];
  if (caster === undefined) return fail(state, 'unit_dead');

  switch (action.kind) {
    case 'cast_skill':
      return castSkillInternal(state, caster, action.skillId, action.targetIds, skillLookup);
    case 'basic_attack': {
      const basicId = caster.basicAttackSkillId ?? SYNTHETIC_BASIC_ATTACK_ID;
      return castSkillInternal(state, caster, basicId, [action.targetId], skillLookup);
    }
    case 'wait':
      return waitInternal(state, caster);
  }
};
