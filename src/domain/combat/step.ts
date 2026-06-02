import {
  isSpecified,
  type Skill,
  type SkillId,
} from '../../content/types';
import { computeHitThresholds, rollHit, type HitRoll } from './d20';
import { applySkillEffects } from './effects';
import { resolveSkillOrSynthetic, SYNTHETIC_BASIC_ATTACK_ID } from './factory';
import { sortedTurnOrder } from './queue';
import { appendLog, patchUnit } from './stateUtils';
import { effectiveStats } from './stats';
import { canCast, resolveTargets } from './validate';
import {
  toInstanceId,
  type Action,
  BattleEvent,
  BattleResult,
  BattleState,
  InstanceId,
  StepError,
  StepResult,
  Unit,
} from './types';

const EPSILON = 1e-9;

// appendLog and patchUnit are imported from ./stateUtils

const fail = (state: BattleState, reason: StepError): StepResult => ({
  ok: false,
  reason,
  state,
});

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

  const resolvedTargets = resolveTargets(state, caster, skill, requestedTargetIds);
  const comparisonTarget = resolvedTargets
    .map((id) => state.units[id])
    .find((unit): unit is Unit => unit !== undefined && !unit.isDead);
  const casterStats = effectiveStats(caster);
  const targetStats = comparisonTarget !== undefined ? effectiveStats(comparisonTarget) : null;
  const hitThresholds =
    targetStats === null
      ? computeHitThresholds(casterStats.agility, casterStats.agility, casterStats.critChance)
      : computeHitThresholds(
          casterStats.agility,
          targetStats.agility,
          casterStats.critChance,
        );

  // Apply per-skill accuracy modifiers before rolling.
  const rawFail = skill.neverMiss
    ? 0
    : Math.max(0, hitThresholds.failThreshold - (skill.accuracyBonus ?? 0));
  const adjustedThresholds: typeof hitThresholds = { ...hitThresholds, failThreshold: rawFail };

  const tick = state.tick + 1;
  const hit: HitRoll = rollHit(state.seed, state.rngCursor, adjustedThresholds);
  let cursor = hit.nextCursor;

  let next = payResourceCosts(state, caster, validation.mpCost, validation.hpCost);
  const casterAfterCost = next.units[caster.id] ?? caster;
  next = chargeCt(next, casterAfterCost, validation.ctCost);
  const casterAfterCt = next.units[caster.id] ?? caster;
  next = setCooldown(next, casterAfterCt, skill);

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
    case 'defend':
      return defendInternal(state, caster);
    case 'use_item':
      return useItemInternal(state, caster, action.itemSkillId, action.targetId, skillLookup);
    case 'wait':
      return waitInternal(state, caster);
  }
};

// ─── Defend Action ────────────────────────────────────────────────

const DEFEND_CT_COST = 10;
const DEFEND_CT_REDUCTION = 20;
const DEFEND_DEFENSE_BUFF = 30;
const DEFEND_BUFF_DURATION = 8;

/**
 * Defend: unit takes a defensive stance.
 * - Low CT cost (10).
 * - Grants +30% defense buff for 8 seconds.
 * - Reduces next action CT cost by 20.
 */
const defendInternal = (state: BattleState, caster: Unit): StepResult => {
  if (caster.isDead) return fail(state, 'unit_dead');
  if (caster.ct > EPSILON) return fail(state, 'not_ready');

  const tick = state.tick + 1;
  let next = chargeCt(state, caster, DEFEND_CT_COST);
  const casterAfterCt = next.units[caster.id] ?? caster;

  // Apply defense buff as a status
  const defenseBuff: Unit['statuses'][number] = {
    id: toInstanceId(`defend_${caster.id}_${tick}`),
    kind: 'buff',
    sourceUnitId: caster.id,
    skillId: 'skill.defend' as SkillId,
    snapshot: {
      magnitude: DEFEND_DEFENSE_BUFF,
      magnitudeUnit: 'percent',
      sourceStrength: caster.baseStats.strength,
      sourceIntellect: caster.baseStats.intellect,
      sourceAgility: caster.baseStats.agility,
      statTag: 'defense',
    },
    remainingSec: DEFEND_BUFF_DURATION,
    stacks: 1,
    tickIntervalSec: 0,
    secSinceLastTick: 0,
    tags: ['defensive'],
  };

  next = patchUnit(next, casterAfterCt.id, {
    defendStance: DEFEND_CT_REDUCTION,
    statuses: [...casterAfterCt.statuses, defenseBuff],
  });

  next = appendLog(next, [
    {
      tick,
      type: 'status_applied',
      sourceUnitId: caster.id,
      targetUnitId: caster.id,
      statusKind: 'buff',
      skillId: 'skill.defend' as SkillId,
      remainingSec: DEFEND_BUFF_DURATION,
      stacks: 1,
    },
    {
      tick,
      type: 'defend_used',
      unitId: caster.id,
    },
  ]);

  next = { ...next, tick };
  next = resortAfterChange(next);
  return { ok: true, state: next };
};

// ─── Use Item Action ──────────────────────────────────────────────

const ITEM_CT_COST = 15;
const ITEM_COOLDOWN_SEC = 30;

/**
 * Use an item: resolves like a self-target (or ally-target) skill.
 * Items are consumable skills (stimpack, energy cell, etc.).
 * Low CT cost, shared cooldown per item type.
 */
const useItemInternal = (
  state: BattleState,
  caster: Unit,
  itemSkillId: SkillId,
  targetId: InstanceId | undefined,
  skillLookup: (id: SkillId) => Skill | undefined,
): StepResult => {
  if (caster.isDead) return fail(state, 'unit_dead');
  if (caster.ct > EPSILON) return fail(state, 'not_ready');

  const skill = skillLookup(itemSkillId);
  if (skill === undefined) return fail(state, 'skill_not_owned');

  // Check item-specific cooldown
  const currentCooldown = caster.cooldowns[itemSkillId];
  if (currentCooldown !== undefined && currentCooldown > EPSILON) {
    return fail(state, 'skill_on_cooldown');
  }

  // Items always target self or ally
  const targetIds: readonly InstanceId[] = targetId ? [targetId] : [caster.id];

  // Use the standard skill resolution pipeline, but with item-specific CT/cooldown
  const tick = state.tick + 1;

  // Pay resource costs (items typically have none)
  const mpCost = skill.resource.type === 'MP' ? (isSpecified(skill.resource.cost) ? skill.resource.cost : 0) : 0;
  const hpCost = skill.resource.type === 'HP'
    ? Math.round(caster.hpMax * (isSpecified(skill.resource.cost) ? skill.resource.cost : 0))
    : 0;

  let next = payResourceCosts(state, caster, mpCost, hpCost);
  const casterAfterCost = next.units[caster.id] ?? caster;
  next = chargeCt(next, casterAfterCost, ITEM_CT_COST);
  const casterAfterCt = next.units[caster.id] ?? caster;

  // Set item cooldown
  next = patchUnit(next, casterAfterCt.id, {
    cooldowns: { ...casterAfterCt.cooldowns, [itemSkillId]: ITEM_COOLDOWN_SEC },
  });

  // Resolve effect (self-targeted)
  const casterStats = effectiveStats(caster);
  const hitThresholds = computeHitThresholds(
    casterStats.agility,
    casterStats.agility,
    0,
  );
  const hit: HitRoll = rollHit(state.seed, state.rngCursor, {
    ...hitThresholds,
    failThreshold: 0,
  });
  let cursor = hit.nextCursor;

  next = appendLog(next, [
    {
      tick,
      type: 'skill_cast',
      unitId: caster.id,
      skillId: skill.id,
      targetIds,
      hitTier: hit.tier,
      severity: hit.severity,
    },
  ]);

  const effectOutcome = applySkillEffects(next, casterAfterCt, targetIds, skill, hit, cursor, tick);
  cursor = effectOutcome.cursor;
  next = effectOutcome.state;

  next = { ...next, tick, rngCursor: cursor };
  next = resortAfterChange(next);
  next = sealResultIfEnded(next, tick);

  return { ok: true, state: next };
};
